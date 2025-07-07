import axios from 'axios';
import { withCors } from '../../_utils/cors.js';
import { validateEnv } from '../../_utils/env.js';

validateEnv(['KICK_CLIENT_ID', 'KICK_CLIENT_SECRET']);

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required.' });
  }

  const { KICK_CLIENT_ID, KICK_CLIENT_SECRET } = process.env;

  try {
    const tokenUrl = 'https://id.kick.com/oauth/token';
    console.log('Refreshing Kick token...');

    const response = await axios.post(tokenUrl, new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: KICK_CLIENT_ID,
      client_secret: KICK_CLIENT_SECRET,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token, scope, expires_in } = response.data;
    console.log('Successfully refreshed Kick token.');

    res.status(200).json({
      accessToken: access_token,
      refreshToken: refresh_token,
      scope: scope,
      expiresIn: expires_in,
    });
  } catch (err) {
    console.error('Kick token refresh error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ message: 'Failed to refresh Kick token.', error: err.response?.data || 'Internal Server Error' });
  }
}

export default withCors(handler);

