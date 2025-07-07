import axios from 'axios';
import cookie from 'cookie';

export default async function handler(req, res) {
  const { code, error, state } = req.query;
  const cookies = cookie.parse(req.headers.cookie || '');
  const storedState = cookies.kick_oauth_state;
  const codeVerifier = cookies.kick_code_verifier;

  if (error) {
    console.error('Kick auth error:', error);
    return res.status(400).send(`<!DOCTYPE html><html><body><h1>Error</h1><p>${error}</p></body></html>`);
  }

  if (!code) {
    return res.status(400).send('<!DOCTYPE html><html><body><h1>Error</h1><p>No code provided.</p></body></html>');
  }

  if (!state || !storedState || state !== storedState) {
    return res.status(400).send('<!DOCTYPE html><html><body><h1>Error</h1><p>Invalid state. Please try again.</p></body></html>');
  }

  if (!codeVerifier) {
    console.error('Kick callback error: The "kick_code_verifier" cookie was missing or empty.');
    return res.status(400).send('<!DOCTYPE html><html><body><h1>Authentication Error</h1><p>Your session may have expired or cookies are not being sent correctly. Please try logging in again.</p></body></html>');
  }

  const { KICK_CLIENT_ID, KICK_CLIENT_SECRET, NEXT_PUBLIC_KICK_REDIRECT_URI } = process.env;

  try {
    const tokenUrl = 'https://id.kick.com/oauth/token';
    console.log('Attempting Kick token exchange. ENV check: Client ID loaded:', !!KICK_CLIENT_ID, 'Secret loaded:', !!KICK_CLIENT_SECRET);

    const tokenResponse = await axios.post(tokenUrl, new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: KICK_CLIENT_ID,
      client_secret: KICK_CLIENT_SECRET,
      redirect_uri: NEXT_PUBLIC_KICK_REDIRECT_URI,
      code_verifier: codeVerifier,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token, scope } = tokenResponse.data;
    console.log('Received payload from Kick token endpoint:', tokenResponse.data);

    // --- NEW STRATEGY: Use the OIDC standard /userinfo endpoint ---
    // This new strategy attempts to use the standard OpenID Connect /userinfo endpoint,
    // which is often available on the same domain that issues the tokens.
    let userId, userName;
    try {
      const userInfoUrl = 'https://id.kick.com/userinfo';
      console.log(`Attempting to fetch user info from new endpoint: ${userInfoUrl}`);

      const userResponse = await axios.get(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
        },
      });
      console.log('Received payload from Kick USERINFO endpoint:', userResponse.data);

      // OIDC standard claims are 'sub' for user ID and often 'preferred_username' or 'name'.
      // We will check for Kick-specific ones too, like 'kick_username'.
      userId = userResponse.data.sub || userResponse.data.id;
      userName = userResponse.data.kick_username || userResponse.data.preferred_username || userResponse.data.username;

      if (!userId || !userName) {
        throw new Error(`Userinfo endpoint did not return required claims. Response: ${JSON.stringify(userResponse.data)}`);
      }
    } catch (apiError) {
      // Log the full error for definitive debugging
      console.error('Failed to fetch user info from Kick API:', {
        message: apiError.message,
        url: apiError.config?.url,
        status: apiError.response?.status,
        headers: apiError.response?.headers,
        data: apiError.response?.data,
      });
      return res.status(500).send(`<!DOCTYPE html><html><body><h1>Authentication Failed</h1><p>Could not fetch your user profile from Kick after logging in. The API may be temporarily unavailable or your account may have restrictions.</p></body></html>`);
    }

    // Clear the state and verifier cookies
    res.setHeader('Set-Cookie', [
      cookie.serialize('kick_oauth_state', '', { httpOnly: true, secure: process.env.NODE_ENV !== 'development', expires: new Date(0), path: '/' }),
      cookie.serialize('kick_code_verifier', '', { httpOnly: true, secure: process.env.NODE_ENV !== 'development', expires: new Date(0), path: '/' }),
    ]);

    // Build the payload to send to the frontend
    const authPayload = {
      type: 'kick-auth-success',
      accessToken: access_token,
      userId: userId,
      userName: userName,
      scope: scope,
    };
    if (refresh_token) {
      authPayload.refreshToken = refresh_token;
    }

    // This script sends the data back to the main window
    const script = `
      <script>
        const authData = ${JSON.stringify(authPayload)};
        if (window.opener) {
          const targetOrigin = 'https://sheepherd1.github.io';
          window.opener.postMessage(authData, targetOrigin);
        }
        window.close();
      </script>
    `;
    
    res.status(200).send(`<!DOCTYPE html><html><body><p>Authenticating...</p>${script}</body></html>`);

  } catch (err) {
    console.error('Kick callback error:', {
      message: err.message,
      isAxiosError: err.isAxiosError,
      requestUrl: err.config?.url,
      responseStatus: err.response?.status,
      responseData: err.response?.data,
    });

    let userErrorMessage = 'An internal server error occurred. Please check the Vercel function logs for details.';
    if (err.isAxiosError && err.response) {
      const apiError = err.response.data;
      userErrorMessage = `Kick API Error: ${apiError.message || JSON.stringify(apiError)} (Status: ${err.response.status} on ${err.config.url})`;
    } else if (err.isAxiosError) {
      userErrorMessage = `Network Error: Could not reach Kick's servers. Please check your connection.`;
    }
    
    res.status(500).send(`<!DOCTYPE html><html><body><h1>Authentication Failed</h1><p>${userErrorMessage}</p></body></html>`);
  }
}
