import express from 'express';
import axios from 'axios';

const {
    TROVO_CLIENT_ID,
    TROVO_CLIENT_SECRET,
    TROVO_REDIRECT_URI,
    FRONTEND_URL
} = process.env;
const router = express.Router();

// Trovo API endpoints
const TROVO_AUTH_URL = 'https://open.trovo.live/page/login.html';
const TROVO_TOKEN_URL = 'https://open-api.trovo.live/openplatform/exchangetoken';
const TROVO_GET_USER_URL = 'https://open-api.trovo.live/openplatform/getuserinfo';

/**
 * Route to begin the Trovo authentication process.
 * This is the endpoint the "Connect with Trovo" button on the frontend calls.
 * It redirects the user to Trovo's authorization page.
 */
router.get('/connect', (req, res) => {
    // Define the permissions (scopes) your application needs.
    const requiredScopes = [
        'user_details_self',
        'channel_details_self',
        'channel_update_self',
        // Add any other scopes you need for your application's functionality
    ];
    const scope = requiredScopes.join('+');

    const params = new URLSearchParams({
        client_id: TROVO_CLIENT_ID,
        response_type: 'code',
        scope: scope,
        redirect_uri: TROVO_REDIRECT_URI,
        // It's highly recommended to use a 'state' parameter for security (CSRF protection)
        // state: 'a_random_unguessable_string'
    });

    res.redirect(`${TROVO_AUTH_URL}?${params.toString()}`);
});

/**
 * The callback route that Trovo redirects to after user authorization.
 * It exchanges the authorization code for an access token and refresh token.
 */
router.get('/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Authorization code is missing.');
    }

    try {
        // Exchange the authorization code for tokens
        const tokenResponse = await axios.post(TROVO_TOKEN_URL, {
            client_id: TROVO_CLIENT_ID,
            client_secret: TROVO_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: TROVO_REDIRECT_URI,
        });

        const { access_token, refresh_token, scope } = tokenResponse.data;

        // Use the new access token to get the user's information
        const userResponse = await axios.get(TROVO_GET_USER_URL, {
            headers: {
                'Accept': 'application/json',
                'Client-ID': TROVO_CLIENT_ID,
                'Authorization': `OAuth ${access_token}`,
            },
        });

        const { uid, nickName } = userResponse.data;

        // This script sends the tokens and user data back to the parent window (your React app)
        // and then closes the popup.
        res.send(`
            <script>
                window.opener.postMessage({
                    type: 'trovo-auth-success',
                    accessToken: '${access_token}',
                    refreshToken: '${refresh_token}',
                    userId: '${uid}',
                    userName: '${nickName}',
                    scope: '${scope}'
                }, '${FRONTEND_URL}');
                window.close();
            </script>
        `);
    } catch (error) {
        console.error('Trovo callback error:', error.response ? error.response.data : error.message);
        res.status(500).send('An error occurred during Trovo authentication.');
    }
});

/**
 * Route to refresh an expired access token using a refresh token.
 * This is called by the frontend API interceptor.
 */
router.post('/refresh', async (req, res) => {
    // This endpoint is not yet implemented in Trovo's API as of the last documentation review.
    // This is a placeholder for when they add refresh token support.
    // For now, users may need to re-authenticate more often.
    res.status(501).json({ message: 'Trovo token refresh is not yet supported by their API.' });
});

export default router;