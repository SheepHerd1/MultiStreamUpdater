import express from 'express';
import axios from 'axios';

const router = express.Router();
const KICK_API_BASE = 'https://api.kick.com/public/v1';

// This middleware will handle all requests to /api/kick
router.all('/', async (req, res) => {
  const { action } = req.query;
  const accessToken = req.headers.authorization?.split(' ')[1];

  if (!accessToken) {
    return res.status(401).json({ message: 'Unauthorized: Missing access token.' });
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  try {
    let response;
    switch (action) {
      case 'user_info': {
        const userResponse = await axios.get(`${KICK_API_BASE}/users`, { headers });
        return res.status(200).json(userResponse.data.data?.[0] || {});
      }

      case 'stream_info': {
        const { channel: channelSlug } = req.query;
        if (!channelSlug) return res.status(400).json({ message: 'Channel slug is required.' });
        
        const url = `${KICK_API_BASE}/channels?slug=${encodeURIComponent(channelSlug)}`;
        response = await axios.get(url, { headers });
        return res.status(200).json(response.data.data?.[0] || {});
      }

      case 'stream_update': {
        if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed.' });
        
        const { channel, title, category } = req.body;
        if (!channel) return res.status(400).json({ message: 'Channel slug is required.' });

        const url = `${KICK_API_BASE}/channels/${encodeURIComponent(channel)}`;
        response = await axios.patch(url, { session_title: title, category_name: category }, { headers });
        return res.status(response.status).json({ success: true });
      }

      case 'search_categories': {
        const { q } = req.query;
        if (!q) return res.status(400).json({ message: 'Search query "q" is required.' });

        const url = `${KICK_API_BASE}/categories?q=${encodeURIComponent(q)}`;
        response = await axios.get(url, { headers });
        return res.status(200).json(response.data);
      }

      default:
        return res.status(400).json({ message: 'Invalid action specified.' });
    }
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { message: 'An internal proxy error occurred.' };
    console.error(`[Kick Proxy Error] Action: "${action}", Status: ${status}`, data);
    return res.status(status).json(data);
  }
});

export default router;