import axios from 'axios';
import cookie from 'cookie';

// No CORS wrapper needed here as it renders HTML, not an API response for the frontend app.

export default async function handler(req, res) {
  const { code, error, state } = req.query;
  const cookies = cookie.parse(req.headers.cookie || '');
  const storedState = cookies.kick_oauth_state;
  const codeVerifier = cookies.kick_code_verifier;

  if (error) {
    console.error('Kick auth error:', error);
    return res.status(400).send(`<html><body><h1>Error</h1><p>${error}</p></body></html>`);
  }

  if (!code) {
    return res.status(400).send('<html><body><h1>Error</h1><p>No code provided.</p></body></html>');
  }

  if (!state || !storedState || state !== storedState) {
    return res.status(400).send('<html><body><h1>Error</h1><p>Invalid state. Please try again.</p></body></html>');
  }

  const { KICK_CLIENT_ID, KICK_CLIENT_SECRET, NEXT_PUBLIC_KICK_REDIRECT_URI } = process.env;

  try {
    // Correct token endpoint URL from Kick's documentation
    const tokenUrl = 'https://id.kick.com/oauth/token';
    
    const response = await axios.post(tokenUrl, new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: KICK_CLIENT_ID,
      client_secret: KICK_CLIENT_SECRET,
      redirect_uri: NEXT_PUBLIC_KICK_REDIRECT_URI,
      code_verifier: codeVerifier,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, refresh_token } = response.data;

    // Clear the cookies after successful token exchange
    res.setHeader('Set-Cookie', [
      cookie.serialize('kick_oauth_state', '', { httpOnly: true, secure: process.env.NODE_ENV !== 'development', expires: new Date(0), path: '/' }),
      cookie.serialize('kick_code_verifier', '', { httpOnly: true, secure: process.env.NODE_ENV !== 'development', expires: new Date(0), path: '/' }),
    ]);

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