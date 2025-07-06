import axios from 'axios';
import { withCors } from './_utils/cors.js';

// The Kick API is hosted at kick.com/api, not a separate subdomain.
// This is confirmed by server responses (404 on api.kick.com vs 401 on kick.com/api).
const KICK_API_BASE_URL = 'https://kick.com/api/v2';

// --- Reusable API Client & Error Handler ---

/**
 * Creates a pre-configured Axios instance for making requests to the Kick API.
 * @param {string} token The user's OAuth Bearer token.
 * @returns A configured Axios instance.
 */
const createKickApiClient = (token) => {
  return axios.create({
    baseURL: KICK_API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'User-Agent': 'MultiStreamUpdater/1.0.0',
    },
  });
};

/**
 * Centralized error handler for API requests.
 * @param {object} res The Express response object.
 * @param {Error} error The error caught from the API call.
 * @param {string} context A descriptive string for the action that failed.
 */
const handleApiError = (res, error, context) => {
  console.error(`Error ${context}:`, error.response?.data || error.message);
  const status = error.response?.status || 500;
  const message = error.response?.data?.message || `Failed to ${context}.`;
  res.status(status).json({ error: message });
};

// --- Route Handlers ---

async function handleUserInfo(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

  try {
    const apiClient = createKickApiClient(token);
    const response = await apiClient.get('/user');
    res.status(200).json(response.data);
  } catch (error) {
    handleApiError(res, error, 'fetch user info from Kick');
  }
}

async function handleStreamInfo(req, res) {
  const { channel } = req.query;
  const token = req.headers.authorization?.split(' ')[1];
  if (!channel) return res.status(400).json({ error: 'Channel parameter is required.' });
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

  try {
    const apiClient = createKickApiClient(token);
    const response = await apiClient.get(`/channels/${channel}`);
    const livestreamData = response.data.livestream || {};
    res.status(200).json(livestreamData);
  } catch (error) {
    handleApiError(res, error, 'fetch channel info from Kick');
  }
}

async function handleStreamUpdate(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });
  const { channel, title, category } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel is required.' });

  try {
    const apiClient = createKickApiClient(token);
    const payload = { session_title: title, category_name: category };
    await apiClient.patch(`/channels/${channel}`, payload);
    res.status(200).json({ success: true, message: 'Kick stream updated successfully.' });
  } catch (error) {
    handleApiError(res, error, 'update Kick stream info');
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
