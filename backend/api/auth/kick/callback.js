import axios from 'axios';
import cookie from 'cookie';

export default async function handler(req, res) {
  const { code, error, state } = req.query;
  const cookies = cookie.parse(req.headers.cookie || '');
  const storedState = cookies.kick_oauth_state;
  const codeVerifier = cookies.kick_code_verifier;

  // Basic validation and CSRF/PKCE checks
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
    // Step 1: Exchange the authorization code for an access token. This part is working correctly.
    const tokenUrl = 'https://id.kick.com/oauth/token';
    console.log('Attempting Kick token exchange...');
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
    console.log('Successfully received tokens from Kick.');

    // Step 2: Use the access token to get user info from the correct, documented endpoint.
    let userId, userName;
    try {
      const userInfoUrl = 'https://api.kick.com/public/v1/users';
      console.log(`Fetching user info from documented endpoint: ${userInfoUrl}`);

      const userResponse = await axios.get(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
        },
      });
      
      console.log('Received payload from Kick Users endpoint:', userResponse.data);

      // According to the docs, the response is { data: [ { user_id, name, ... } ] }
      const userDataArray = userResponse.data.data;
      if (!userDataArray || userDataArray.length === 0) {
        throw new Error('User data array is empty or missing in the API response.');
      }
      
      const userProfile = userDataArray[0];
      userId = userProfile.user_id;
      userName = userProfile.name;

      if (!userId || !userName) {
        throw new Error(`Could not extract user_id or name from user profile. Profile: ${JSON.stringify(userProfile)}`);
      }
      console.log(`Successfully extracted userId: ${userId} and userName: ${userName}`);

    } catch (apiError) {
      console.error('Failed to fetch user info from Kick API:', {
        message: apiError.message,
        url: apiError.config?.url,
        status: apiError.response?.status,
        data: apiError.response?.data,
      });
      return res.status(500).send(`<!DOCTYPE html><html><body><h1>Authentication Failed</h1><p>Could not fetch your user profile from Kick after logging in. The API may be temporarily unavailable or your account may have restrictions.</p></body></html>`);
    }

    // Step 3: Send the successful authentication data back to the main application window.
    res.setHeader('Set-Cookie', [
      cookie.serialize('kick_oauth_state', '', { httpOnly: true, secure: process.env.NODE_ENV !== 'development', expires: new Date(0), path: '/' }),
      cookie.serialize('kick_code_verifier', '', { httpOnly: true, secure: process.env.NODE_ENV !== 'development', expires: new Date(0), path: '/' }),
    ]);

    const authPayload = {
      type: 'kick-auth-success',
      accessToken: access_token,
      userId: userId,
      userName: userName,
      scope: scope,
      refreshToken: refresh_token,
    };

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
      userErrorMessage = `Kick API Error: ${apiError.error || JSON.stringify(apiError)} (Status: ${err.response.status} on ${err.config.url})`;
    }
    
    res.status(500).send(`<!DOCTYPE html><html><body><h1>Authentication Failed</h1><p>${userErrorMessage}</p></body></html>`);
  }
}
