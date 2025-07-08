const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI, FRONTEND_URL } = process.env;

function getOAuth2Client() {
    return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI);
}

// Route: /api/auth/youtube/connect
router.get('/connect', (req, res) => {
    const oauth2Client = getOAuth2Client();
    const scopes = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl'
    ];
    const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });
    res.redirect(302, authorizationUrl);
});

// Route: /api/auth/youtube/callback
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Authorization code is missing.');
    }
    try {
        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        
        res.send(`
            <script>
                window.opener.postMessage({
                    type: 'youtube-auth-success',
                    accessToken: '${tokens.access_token}',
                    refreshToken: '${tokens.refresh_token}'
                }, '${FRONTEND_URL}');
                window.close();
            </script>
        `);
    } catch (error) {
        console.error('YouTube callback error:', error.response?.data || error.message);
        res.status(500).send('An error occurred during YouTube authentication.');
    }
});

// Route: /api/auth/youtube/refresh
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required.' });
    }
    try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const { token: newAccessToken } = await oauth2Client.getAccessToken();
        res.status(200).json({ access_token: newAccessToken });
    } catch (error) {
        console.error('Error refreshing YouTube token:', error.response?.data || error.message);
        res.status(401).json({ error: 'Failed to refresh token. Please re-authenticate.' });
    }
});

module.exports = router;