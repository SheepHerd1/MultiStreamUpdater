import { google } from 'googleapis';

// This function will be hosted at /api/auth/youtube/callback
export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', 'https://sheepherd1.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).send('');
  }

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
    
    // Use the same postMessage flow as Twitch for consistency and reliability
    const targetOrigin = new URL(process.env.FRONTEND_URL).origin;
    const renderScript = (message) => `
    <!DOCTYPE html><html><head><title>Authenticating...</title></head><body>
    <script>
      window.opener.postMessage(${JSON.stringify(message)}, '${targetOrigin}');
      window.close();
    </script>
    <p>Authentication complete. You can close this window.</p>
    </body></html>
    `;

    const successMessage = {
      type: 'youtube-auth-success',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(renderScript(successMessage));
  } catch (error) {
    console.error('Error exchanging auth code for tokens:', error.response?.data || error.message);
    res.status(500).send('Failed to authenticate with YouTube.');
  }
}
