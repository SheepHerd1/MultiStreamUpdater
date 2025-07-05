import { google } from 'googleapis';

// This function will be hosted at /api/auth/youtube/callback
export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Error: Missing authorization code from Google.');
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    // Exchange the authorization code for access and refresh tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Redirect back to your frontend, passing tokens in the URL hash.
    // The frontend will be responsible for storing them (e.g., in localStorage).
    const frontendUrl = new URL(process.env.FRONTEND_URL);
    
    // The hash is used because it's not sent to servers, keeping tokens more secure.
    const hashParams = new URLSearchParams();
    hashParams.append('yt_access_token', tokens.access_token);
    if (tokens.refresh_token) {
      hashParams.append('yt_refresh_token', tokens.refresh_token);
    }
    frontendUrl.hash = hashParams.toString();

    res.redirect(302, frontendUrl.toString());
  } catch (error) {
    console.error('Error exchanging auth code for tokens:', error.response?.data || error.message);
    res.status(500).send('Failed to authenticate with YouTube.');
  }
}