import axios from 'axios';

const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', 'https://sheepherd1.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.error('Function error in twitch/refresh.js: Missing Twitch environment variables.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
    });

    const response = await axios.post('https://id.twitch.tv/oauth2/token', params);
    const { access_token, refresh_token } = response.data;

    // Twitch provides a new refresh token each time, so we must return both.
    res.status(200).json({ accessToken: access_token, refreshToken: refresh_token });
  } catch (error) {
    console.error('Error refreshing Twitch token:', error.response?.data || error.message);
    res.status(401).json({ error: 'Failed to refresh Twitch token. Please re-authenticate.' });
  }
}