import axios from 'axios';
import { withCors } from '../../_utils/cors.js';
import { validateEnv } from '../../_utils/env.js';

// Ensure required environment variables are set
validateEnv(['KICK_CLIENT_ID', 'KICK_CLIENT_SECRET']);
const { KICK_CLIENT_ID, KICK_CLIENT_SECRET } = process.env;

const KICK_TOKEN_URL = 'https://id.kick.com/oauth/token';

/**
 * Handles refreshing an expired access token using a refresh token.
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token not provided.' });
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refresh_token);
    params.append('client_id', KICK_CLIENT_ID);
    params.append('client_secret', KICK_CLIENT_SECRET);

    const response = await axios.post(KICK_TOKEN_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // Pass through the relevant data from Kick's response
    res.status(200).json({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token, // Kick may return a new refresh token
      expires_in: response.data.expires_in,
    });
  } catch (error) {
    console.error('Error refreshing Kick token:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to refresh Kick token.' });
  }
}

export default withCors(handler);