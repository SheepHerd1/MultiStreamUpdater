import axios from 'axios';
import { withCors } from '../../_utils/cors.js';
import { validateEnv } from '../../_utils/env.js';

validateEnv(['KICK_CLIENT_ID', 'KICK_CLIENT_SECRET']);

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token not provided.' });
  }

  const { KICK_CLIENT_ID, KICK_CLIENT_SECRET } = process.env;

  try {
    // This was pointing to the wrong domain. All auth actions happen on id.kick.com.
    const tokenUrl = 'https://id.kick.com/oauth/token';
    
    const response = await axios.post(tokenUrl, new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: KICK_CLIENT_ID,
      client_secret: KICK_CLIENT_SECRET,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token } = response.data;

    // Note: Kick might not return a new refresh token. If it doesn't, reuse the old one.
    res.status(200).json({ accessToken: access_token, refreshToken: refresh_token || refreshToken });
  } catch (err) {
    console.error('Error refreshing Kick token:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Failed to refresh Kick token.' });
  }
}

export default withCors(handler);