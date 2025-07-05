import { google } from 'googleapis';

export default async function handler(req, res) {
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

    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Error refreshing YouTube token:', error.response?.data || error.message);
    res.status(401).json({ error: 'Failed to refresh token. Please re-authenticate.' });
  }
}