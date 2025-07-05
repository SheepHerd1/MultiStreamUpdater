import { google } from 'googleapis';

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

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Get a new access token
    const { token: newAccessToken } = await oauth2Client.getAccessToken();

    // The frontend interceptor expects the key to be 'access_token'
    res.status(200).json({ access_token: newAccessToken });
  } catch (error) {
    console.error('Error refreshing YouTube token:', error.response?.data || error.message);
    res.status(401).json({ error: 'Failed to refresh token. Please re-authenticate.' });
  }
}