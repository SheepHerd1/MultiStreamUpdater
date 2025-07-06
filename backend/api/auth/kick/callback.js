import axios from 'axios';

// No CORS wrapper needed here as it renders HTML, not an API response for the frontend app.

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    console.error('Kick auth error:', error);
    return res.status(400).send(`<html><body><h1>Error</h1><p>${error}</p></body></html>`);
  }

  if (!code) {
    return res.status(400).send('<html><body><h1>Error</h1><p>No code provided.</p></body></html>');
  }

  const { KICK_CLIENT_ID, KICK_CLIENT_SECRET, NEXT_PUBLIC_KICK_REDIRECT_URI } = process.env;

  try {
    // NOTE: The token endpoint URL should be confirmed from the official Kick API documentation.
    const tokenUrl = 'https://kick.com/api/v2/oauth/token';
    
    const response = await axios.post(tokenUrl, new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: KICK_CLIENT_ID,
      client_secret: KICK_CLIENT_SECRET,
      redirect_uri: NEXT_PUBLIC_KICK_REDIRECT_URI,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, refresh_token } = response.data;

    // This script sends the tokens back to the main window that opened the popup.
    const script = `
      <script>
        const authData = {
          type: 'kick-auth-success',
          accessToken: '${access_token}',
          refreshToken: '${refresh_token}',
        };
        if (window.opener) {
          window.opener.postMessage(authData, '*'); // Use your frontend URL in production
        }
        window.close();
      </script>
    `;
    
    res.status(200).send(`<html><body><p>Authenticating...</p>${script}</body></html>`);

  } catch (err) {
    console.error('Error exchanging Kick code for token:', err.response?.data || err.message);
    res.status(500).send('<html><body><h1>Authentication Failed</h1><p>Could not get tokens from Kick.</p></body></html>');
  }
}