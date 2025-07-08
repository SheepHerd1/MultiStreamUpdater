import axios from 'axios';
import { withCors } from './_utils/cors.js';
import { validateEnv } from './_utils/env.js';

validateEnv(['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET']);
const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;

// --- App Access Token Cache (for category search) ---
const tokenCache = {
  token: null,
  expiresAt: 0,
};

async function getAppAccessToken() {
  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expiresAt - 60000) {
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
    throw new Error('Could not authenticate with Twitch for category search.');
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
async function handleStreamInfo(req, res) {
  const { broadcaster_id } = req.query;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !broadcaster_id) {
    return res.status(401).json({ error: 'Missing token or broadcaster_id' });
  }
  try {
    const response = await axios.get(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id}`, {
      headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` },
    });
    res.status(200).json(response.data.data[0]);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch Twitch stream info.' });
  }
}

async function handleStreamUpdate(req, res) {
  const { broadcasterId, title, category, tags } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !broadcasterId) {
    return res.status(401).json({ error: 'Missing token or broadcasterId' });
  }
  try {
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
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Failed to update Twitch stream.' });
  }
}

async function handleCategories(req, res) {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }
  try {
    const token = await getAppAccessToken();
    const response = await axios.get(`https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(query)}`, {
      headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` },
    });
    res.status(200).json(response.data.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search Twitch categories.' });
  }
}

async function handleAllTags(req, res) {
  try {
    const appAccessToken = await getAppAccessToken();
    const tags = await getAllTags(appAccessToken);
    res.status(200).json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// --- Main Handler ---
async function handler(req, res) {
  const { action } = req.query;

  if (req.method === 'GET') {
    switch (action) {
      case 'stream_info':
        return handleStreamInfo(req, res);
      case 'categories':
        return handleCategories(req, res);
      case 'all_tags':
        return handleAllTags(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  }

  if (req.method === 'POST') {
    switch (action) {
      case 'stream_update':
        return handleStreamUpdate(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

export default withCors(handler);
