import axios from 'axios';

// We assume environment variables are validated at a higher level or are present.
const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;

// --- App Access Token Cache (for category search) ---
const tokenCache = {
  token: null,
  expiresAt: 0,
};

async function getAppAccessToken() {
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.error('Twitch API Error: Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in environment.');
    throw new Error('Server is not configured for Twitch API calls.');
  }

  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expiresAt - 60000) { // 60s buffer
    return tokenCache.token;
  }
  try {
    const response = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
      params: { client_id: TWITCH_CLIENT_ID, client_secret: TWITCH_CLIENT_SECRET, grant_type: 'client_credentials' },
    });
    const { access_token, expires_in } = response.data;
    tokenCache.token = access_token;
    tokenCache.expiresAt = now + (expires_in * 1000);
    return access_token;
  } catch (error) {
    console.error('Error getting Twitch App Access Token:', error.response?.data);
    tokenCache.token = null;
    tokenCache.expiresAt = 0;
    const twitchError = error.response?.data?.message || 'An unknown error occurred during app authentication.';
    throw new Error(`Could not get app token: ${twitchError}`);
  }
}

// --- All Tags Cache ---
const allTagsCache = {
  tags: [],
  expiresAt: 0,
};

async function getAllTags(appAccessToken) {
  const now = Date.now();
  if (allTagsCache.tags.length > 0 && now < allTagsCache.expiresAt) {
    return allTagsCache.tags;
  }

  let allTags = [];
  let cursor = null;
  const headers = { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${appAccessToken}` };

  try {
    do {
      const url = `https://api.twitch.tv/helix/all-stream-tags?first=100${cursor ? `&after=${cursor}` : ''}`;
      const response = await axios.get(url, { headers });
      const { data, pagination } = response.data;
      
      if (data) allTags.push(...data);
      cursor = pagination?.cursor;
    } while (cursor);

    allTagsCache.tags = allTags;
    allTagsCache.expiresAt = now + (3600 * 1000); // Cache for 1 hour
    console.log(`[Twitch API] Cached ${allTags.length} tags.`);
    return allTags;
  } catch (error) {
    console.error('Error fetching all Twitch tags:', error.response?.data);
    throw new Error('Could not fetch all Twitch tags.');
  }
}

// --- Route Handlers ---
import express from 'express';
const router = express.Router();

router.get('/', async (req, res) => {
  const { action } = req.query;
  const token = req.headers.authorization?.split(' ')[1];

  try {
    switch (action) {
      case 'stream_info': {
        const { broadcaster_id } = req.query;
        if (!token || !broadcaster_id) return res.status(401).json({ error: 'Missing token or broadcaster_id' });
        
        const response = await axios.get(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id}`, {
          headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` },
        });
        return res.status(200).json(response.data.data[0]);
      }

      case 'categories': {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: 'Query parameter is required.' });
        
        const appToken = await getAppAccessToken();
        const response = await axios.get(`https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(query)}`, {
          headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${appToken}` },
        });
        return res.status(200).json(response.data.data);
      }

      case 'all_tags': {
        const appToken = await getAppAccessToken();
        const tags = await getAllTags(appToken);
        return res.status(200).json(tags);
      }

      default:
        return res.status(400).json({ error: 'Invalid GET action' });
    }
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.message || error.response?.data?.error || `Failed to perform Twitch action: ${action}.`;
    console.error(`[Twitch GET Error] Action: ${action}, Status: ${status}`, error.message);
    return res.status(status).json({ error: message });
  }
});

router.post('/', async (req, res) => {
  const { action } = req.query;
  const token = req.headers.authorization?.split(' ')[1];

  try {
    switch (action) {
      case 'stream_update': {
        const { broadcasterId, title, category, tags } = req.body;
        if (!token || !broadcasterId) return res.status(401).json({ error: 'Missing token or broadcasterId' });

        const gameResponse = await axios.get(`https://api.twitch.tv/helix/games?name=${encodeURIComponent(category)}`, {
          headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` },
        });
        const gameId = gameResponse.data.data[0]?.id || '';

        await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, {
          title,
          game_id: gameId,
          tags,
        }, {
          headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ error: 'Invalid POST action' });
    }
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || `Failed to perform Twitch action: ${action}.`;
    console.error(`[Twitch POST Error] Action: ${action}, Status: ${status}`, error.message);
    return res.status(status).json({ error: message });
  }
});

export default router;