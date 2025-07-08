import express from 'express';
import axios from 'axios';

const router = express.Router();
const KICK_API_BASE = 'https://api.kick.com/public/v1';

// Middleware to check for the access token on all Kick routes.
// This cleans up the handlers by centralizing the authorization check.
router.use((req, res, next) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).json({ message: 'Unauthorized: Missing access token.' });
  }
  // Attach the token to the request object so handlers can use it.
  req.kickAccessToken = accessToken;
  next();
});

// GET handler for read-only actions like fetching info and searching.
router.get('/', async (req, res) => {
  const { action } = req.query;
  const headers = {
    'Authorization': `Bearer ${req.kickAccessToken}`,
    'Accept': 'application/json',
  };

  try {
    switch (action) {
      case 'user_info': {
        const userResponse = await axios.get(`${KICK_API_BASE}/users`, { headers });
        return res.status(200).json(userResponse.data.data?.[0] || {});
      }
      case 'stream_info': {
        const { channel: channelSlug } = req.query;
        if (!channelSlug) return res.status(400).json({ message: 'Channel slug is required.' });
        
        const url = `${KICK_API_BASE}/channels?slug=${encodeURIComponent(channelSlug)}`;
        const response = await axios.get(url, { headers });
        return res.status(200).json(response.data.data?.[0] || {});
      }
      case 'search_categories': {
        const { q } = req.query;
        if (!q) return res.status(400).json({ message: 'Search query "q" is required.' });

        const url = `${KICK_API_BASE}/categories?q=${encodeURIComponent(q)}`;
        const response = await axios.get(url, { headers });
        return res.status(200).json(response.data);
      }
      default:
        return res.status(400).json({ message: `Invalid GET action specified: '${action}'` });
    }
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { message: 'An internal proxy error occurred.' };
    console.error(`[Kick GET Error] Action: "${action}", Status: ${status}`, data);
    return res.status(status).json(data);
  }
});

// POST handler for write actions like updating the stream.
router.post('/', async (req, res) => {
  const { action } = req.query;
  const headers = {
    'Authorization': `Bearer ${req.kickAccessToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  try {
    switch (action) {
      case 'stream_update': {
        const { channel, title, category } = req.body;
        if (!channel) return res.status(400).json({ message: 'Channel slug is required.' });

        const url = `${KICK_API_BASE}/channels/${encodeURIComponent(channel)}`;
        const response = await axios.patch(url, { session_title: title, category_name: category }, { headers });
        return res.status(response.status).json({ success: true });
      }
      default:
        return res.status(400).json({ message: `Invalid POST action specified: '${action}'` });
    }
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { message: 'An internal proxy error occurred.' };
    console.error(`[Kick POST Error] Action: "${action}", Status: ${status}`, data);
    return res.status(status).json(data);
  }
});

export default router;