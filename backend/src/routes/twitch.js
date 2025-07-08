import axios from 'axios';

// We assume environment variables are validated at a higher level or are present.
const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;

// --- App Access Token Cache (for category search) ---
const tokenCache = {
  token: null,
  expiresAt: 0,
};

async function getAppAccessToken() {
  // Add detailed logging to diagnose the issue on Vercel.
  console.log('Attempting to get Twitch App Access Token...');
  console.log(`TWITCH_CLIENT_ID available: ${!!process.env.TWITCH_CLIENT_ID}`);
  console.log(`TWITCH_CLIENT_SECRET available: ${!!process.env.TWITCH_CLIENT_SECRET ? 'Yes (hidden for security)' : 'No'}`);

  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.error('Twitch API Error: Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in environment.');
    throw new Error('Server is not configured for Twitch API calls.');
  }

  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expiresAt - 60000) { // 60s buffer
    return tokenCache.token;
  }
  try {
    // Twitch requires the credentials in the body with a specific content type.
    // Using URLSearchParams ensures axios sends the data correctly formatted.
    const params = new URLSearchParams();
    params.append('client_id', TWITCH_CLIENT_ID);
    params.append('client_secret', TWITCH_CLIENT_SECRET);
    params.append('grant_type', 'client_credentials');

    const response = await axios.post('https://id.twitch.tv/oauth2/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

// --- Route Handlers ---
import express from 'express';
const router = express.Router();

const getHandlers = {
  'stream_info': async (req, res, token) => {
    const { broadcaster_id } = req.query;
    if (!token || !broadcaster_id) return res.status(401).json({ error: 'Missing token or broadcaster_id' });
    
    const response = await axios.get(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id}`, {
      headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` },
    });
    return res.status(200).json(response.data.data[0]);
  },
  'categories': async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query parameter is required.' });
    
    const appToken = await getAppAccessToken();
    const response = await axios.get(`https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(query)}`, {
      headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${appToken}` },
    });
    return res.status(200).json(response.data.data);
  },
  'search_tags': async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query parameter is required for tag search.' });

    const appToken = await getAppAccessToken();
    const response = await axios.get(`https://api.twitch.tv/helix/search/tags?query=${encodeURIComponent(query)}`, {
      headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${appToken}` },
    });
    return res.status(200).json(response.data.data);
  }
};

router.get('/', async (req, res) => {
  const { action } = req.query;
  const token = req.headers.authorization?.split(' ')[1];

  const handler = getHandlers[action];

  if (handler) {
    try {
      await handler(req, res, token);
    } catch (error) {
      const status = error.response?.status || 500;
      const message = error.message || error.response?.data?.error || `Failed to perform Twitch action: ${action}.`;
      console.error(`[Twitch GET Error] Action: ${action}, Status: ${status}`, error.message);
      return res.status(status).json({ error: message });
    }
  } else {
    return res.status(404).json({ error: `Invalid GET action specified: '${action}'` });
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