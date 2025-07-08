import express from 'express';
import axios from 'axios';

const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_REDIRECT_URI, FRONTEND_URL } = process.env;
const router = express.Router();

// Route: /api/auth/twitch/connect
router.get('/connect', (req, res) => {
    if (!TWITCH_CLIENT_ID || !TWITCH_REDIRECT_URI) {
        console.error('Function error in twitch/connect: Missing TWITCH_CLIENT_ID or TWITCH_REDIRECT_URI environment variables.');
        return res.status(500).send('Server configuration error. Please contact the site administrator.');
    }

    const TWITCH_SCOPES = 'channel:manage:broadcast openid user:read:broadcast';
    const params = new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        redirect_uri: TWITCH_REDIRECT_URI,
        response_type: 'code',
        scope: TWITCH_SCOPES,
    });
    const authUrl = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
    res.redirect(302, authUrl);
});

// Route: /api/auth/twitch/callback
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Authorization code is missing.');
    }
    try {
        const params = new URLSearchParams({
            client_id: TWITCH_CLIENT_ID,
            client_secret: TWITCH_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: TWITCH_REDIRECT_URI,
        });
        const response = await axios.post('https://id.twitch.tv/oauth2/token', params);
        const { access_token, refresh_token, id_token } = response.data;

        res.send(`
            <script>
                window.opener.postMessage({
                    type: 'twitch-auth-success',
                    token: '${access_token}',
                    refreshToken: '${refresh_token}',
                    id_token: '${id_token}'
                }, '${FRONTEND_URL}');
                window.close();
            </script>
        `);
    } catch (error) {
        console.error('Twitch callback error:', error.response?.data || error.message);
        res.status(500).send('An error occurred during Twitch authentication.');
    }
});

// Route: /api/auth/twitch/refresh
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required.' });
    }
    try {
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: TWITCH_CLIENT_ID,
            client_secret: TWITCH_CLIENT_SECRET,
        });
        const response = await axios.post('https://id.twitch.tv/oauth2/token', params);
        // The frontend interceptor expects 'access_token' and 'refresh_token'
        const { access_token, refresh_token } = response.data;
        res.status(200).json({ access_token, refresh_token });
    } catch (error) {
        console.error('Error refreshing Twitch token:', error.response?.data || error.message);
        res.status(401).json({ error: 'Failed to refresh Twitch token. Please re-authenticate.' });
    }
});

export default router;