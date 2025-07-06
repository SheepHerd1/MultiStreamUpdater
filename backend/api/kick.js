import axios from 'axios';
import { withCors } from './_utils/cors.js';

// The official Kick API is hosted at kick.com/api, not on a separate subdomain.
// This is confirmed by server responses (404 on api.kick.com vs 401 on kick.com/api).
const KICK_API_BASE_URL = 'https://kick.com/api/v2';

// --- Route Handlers ---
async function handleUserInfo(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

  try {
    const kickApiUrl = `${KICK_API_BASE_URL}/user`;
    const response = await axios.get(kickApiUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Accept': 'application/json',
        'User-Agent': 'MultiStreamUpdater/1.0.0'
      },
    });
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching Kick user info:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch user info from Kick.' });
  }
}

async function handleStreamInfo(req, res) {
  const { channel } = req.query;
  const token = req.headers.authorization?.split(' ')[1];

  if (!channel) return res.status(400).json({ error: 'Channel parameter is required.' });
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

  try {
    const kickApiUrl = `${KICK_API_BASE_URL}/channels/${channel}`;
    
    const response = await axios.get(kickApiUrl, {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'User-Agent': 'MultiStreamUpdater/1.0.0'
        } 
    });
    
    const livestreamData = response.data.livestream || {};
    res.status(200).json(livestreamData);
  } catch (error) {
    console.error('Error fetching Kick channel info:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch channel info from Kick.' });
  }
}

async function handleStreamUpdate(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

  const { channel, title, category } = req.body;
  if (!channel || (!title && !category)) {
    return res.status(400).json({ error: 'Channel and at least title or category are required.' });
  }

  try {
    const kickApiUrl = `${KICK_API_BASE_URL}/channels/${channel}`;
    const payload = { session_title: title, category_name: category };
    await axios.patch(kickApiUrl, payload, {
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        'User-Agent': 'MultiStreamUpdater/1.0.0'
      },
    });
    res.status(200).json({ success: true, message: 'Kick stream updated successfully.' });
  } catch (error)
  {
    console.error('Error updating Kick stream info:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Failed to update Kick stream info.';
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
}

// --- Main Handler ---
async function handler(req, res) {
  const { action } = req.query;

  if (req.method === 'GET') {
    switch (action) {
      case 'user_info':
        return handleUserInfo(req, res);
      case 'stream_info':
        return handleStreamInfo(req, res);
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
