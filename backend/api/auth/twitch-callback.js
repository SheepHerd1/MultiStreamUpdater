/**
 * Vercel Serverless Function (ESM)
 * ---
 * This function handles the OAuth2 callback from Twitch.
 */
import axios from 'axios';

async function getTwitchToken(code, env) {
    const url = 'https://id.twitch.tv/oauth2/token';
    const redirectUri = `${env.VITE_APP_VERCEL_URL}/api/auth/twitch-callback`;

    const params = new URLSearchParams({
        client_id: env.TWITCH_CLIENT_ID,
        client_secret: env.TWITCH_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
    });

    const response = await axios.post(url, params);
    return response.data;
}

export default async function handler(req, res) {
    const { code, error } = req.query;
    const { FRONTEND_URL } = process.env; // Your GitHub Pages URL

    // This HTML/JS is sent to the popup. It communicates back to the main window.
    // We derive the origin from the full frontend URL for security and robustness.
    const targetOrigin = new URL(FRONTEND_URL).origin;
    const renderScript = (message) => `
    <!DOCTYPE html><html><head><title>Authenticating...</title></head><body>
    <script>
      const targetOrigin = '${targetOrigin}';
      // Send message to the parent window and then close the popup
      window.opener.postMessage(${JSON.stringify(message)}, targetOrigin);
      window.close();
    </script>
    <p>Authentication complete. You can close this window.</p>
    </body></html>
  `;

    if (error) {
        const errorMessage = { type: 'auth-error', data: { provider: 'twitch', error } };
        res.setHeader('Content-Type', 'text/html');
        return res.status(400).send(renderScript(errorMessage));
    }

    try {
        const tokenData = await getTwitchToken(code, process.env);
        const successMessage = {
            type: 'auth-success',
            data: {
                provider: 'twitch',
                accessToken: tokenData.access_token,
                idToken: tokenData.id_token
            },
        };
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(renderScript(successMessage));
    } catch (e) {
        console.error('Twitch Callback Error:', e.response ? e.response.data : e.message);
        const errorMessage = { type: 'auth-error', data: { provider: 'twitch', error: 'Failed to exchange code for token.' } };
        res.setHeader('Content-Type', 'text/html');
        res.status(500).send(renderScript(errorMessage));
    }
}