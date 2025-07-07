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

  // Explicitly check for the code_verifier cookie. This is critical for the PKCE flow.
  if (!codeVerifier) {
    console.error('Kick callback error: The "kick_code_verifier" cookie was missing or empty.');
    return res.status(400).send('<html><body><h1>Authentication Error</h1><p>Your session may have expired or cookies are not being sent correctly. Please try logging in again.</p></body></html>');
  }

  const { KICK_CLIENT_ID, KICK_CLIENT_SECRET, NEXT_PUBLIC_KICK_REDIRECT_URI } = process.env;

  try {
    // Correct token endpoint URL from Kick's documentation
    const tokenUrl = 'https://id.kick.com/oauth/token';
    
    // Add server-side logging to confirm env vars are loaded. This will appear in your Vercel logs.
    console.log('Attempting Kick token exchange. ENV check: Client ID loaded:', !!KICK_CLIENT_ID, 'Secret loaded:', !!KICK_CLIENT_SECRET);

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

    const { access_token, refresh_token, scope } = response.data;

    // Immediately use the new access token to fetch the user's profile information
    const userResponse = await axios.get('https://kick.com/api/v2/user', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
        'User-Agent': 'MultiStreamUpdater/1.0 (https://multi-stream-updater.vercel.app)',
      },
    });

    const { id: userId, username: userName } = userResponse.data;

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
          userId: '${userId}',
          userName: '${userName}',
          scope: '${scope}',
        };
        if (window.opener) {
          // For security, post only to your frontend's origin.
          const targetOrigin = '${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://multi-stream-updater.vercel.app'}';
          window.opener.postMessage(authData, targetOrigin);
        }
        window.close();
      </script>
    `;
    
    res.status(200).send(`<html><body><p>Authenticating...</p>${script}</body></html>`);

  } catch (err) {
    // Log the detailed error on the server for your own debugging
    console.error('Kick callback error:', {
      message: err.message,
      isAxiosError: err.isAxiosError,
      requestUrl: err.config?.url,
      responseStatus: err.response?.status,
      responseData: err.response?.data,
    });

    // Create a more informative error message for the user's popup
    let userErrorMessage;
    if (err.isAxiosError && err.response) {
      // Error from Kick's API
      const apiError = err.response.data;
      userErrorMessage = `Kick API Error: ${apiError.message || JSON.stringify(apiError)} (Status: ${err.response.status} on ${err.config.url})`;
    } else if (err.isAxiosError) {
      // Network error or other issue with the request
      userErrorMessage = `Network Error: Could not reach Kick's servers. Please check your connection.`;
    } else {
      // Likely a server-side code error (e.g., missing env var)
      userErrorMessage = 'An internal server error occurred. Please check the Vercel function logs for details.';
    }
    res.status(500).send(`<html><body><h1>Authentication Failed</h1><p>${userErrorMessage}</p></body></html>`);
  }
}