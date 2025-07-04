const axios = require('axios');

const {
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
    VITE_APP_VERCEL_URL,
    FRONTEND_URL
} = process.env;

const REDIRECT_URI = `${VITE_APP_VERCEL_URL}/api/auth/twitch`;
const TWITCH_SCOPES = 'channel:manage:broadcast';

module.exports = async (req, res) => {
    const { code } = req.query;

    // 1. If no code, redirect to Twitch for authorization
    if (!code) {
        const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${TWITCH_SCOPES}`;
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
        // Redirect back to the frontend with an error flag for a better user experience
        const errorRedirectUrl = `${FRONTEND_URL}?error=twitch_auth_failed`;
        res.writeHead(302, { Location: errorRedirectUrl });
        res.end();
    }
};