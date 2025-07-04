const axios = require('axios');

const {
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
    VITE_APP_VERCEL_URL,
    FRONTEND_URL
} = process.env;

const REDIRECT_URI = `${VITE_APP_VERCEL_URL}/api/auth/twitch`;

module.exports = async (req, res) => {
    const { code } = req.query;

    // 1. If no code, redirect to Twitch for authorization
    if (!code) {
        const scopes = 'channel:manage:broadcast';
        const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scopes}`;
        res.writeHead(302, { Location: authUrl });
        res.end();
        return;
    }

    // 2. If there is a code, exchange it for an access token
    try {
        const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: TWITCH_CLIENT_ID,
                client_secret: TWITCH_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
            },
        });

        const { access_token, refresh_token } = tokenResponse.data;

        // 3. Redirect back to the frontend with the tokens
        // In a real app, you might store refresh_token securely and only pass back the access_token
        const redirectUrl = `${FRONTEND_URL}?twitch_access_token=${access_token}&twitch_refresh_token=${refresh_token}`;
        
        res.writeHead(302, { Location: redirectUrl });
        res.end();

    } catch (error) {
        console.error('Error exchanging Twitch code for token:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Authentication failed' });
    }
};