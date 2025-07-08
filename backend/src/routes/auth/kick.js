import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import cookie from 'cookie';

const { KICK_CLIENT_ID, KICK_CLIENT_SECRET, KICK_REDIRECT_URI, FRONTEND_URL } = process.env;
const router = express.Router();

// Route: /api/auth/kick/connect
router.get('/connect', (req, res) => {
    if (!KICK_CLIENT_ID || !KICK_REDIRECT_URI) {
        console.error('Function error in kick/connect: Missing KICK_CLIENT_ID or KICK_REDIRECT_URI environment variables.');
        return res.status(500).send('Server configuration error. Please contact the site administrator.');
    }

    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('hex');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    res.setHeader('Set-Cookie', [
        cookie.serialize('kick_oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV !== 'development', maxAge: 60 * 15, path: '/', sameSite: 'lax' }),
        cookie.serialize('kick_code_verifier', codeVerifier, { httpOnly: true, secure: process.env.NODE_ENV !== 'development', maxAge: 60 * 15, path: '/', sameSite: 'lax' }),
    ]);

    const scope = 'user:read channel:read channel:write';
    const params = new URLSearchParams({
        client_id: KICK_CLIENT_ID,
        redirect_uri: KICK_REDIRECT_URI,
        response_type: 'code',
        scope: scope,
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    const kickAuthUrl = `https://id.kick.com/oauth/authorize?${params.toString()}`;
    res.redirect(302, kickAuthUrl);
});

// Route: /api/auth/kick/callback
router.get('/callback', async (req, res) => {
    const { code, state } = req.query;
    const cookies = cookie.parse(req.headers.cookie || '');
    const savedState = cookies.kick_oauth_state;
    const codeVerifier = cookies.kick_code_verifier;

    if (!code || !state || state !== savedState) {
        return res.status(400).send('Invalid state or code.');
    }

    try {
        const tokenUrl = 'https://id.kick.com/oauth/token';
        const tokenResponse = await axios.post(tokenUrl, new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: KICK_CLIENT_ID,
            client_secret: KICK_CLIENT_SECRET,
            redirect_uri: KICK_REDIRECT_URI,
            code_verifier: codeVerifier,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const { access_token, refresh_token, scope } = tokenResponse.data;
        const cookiesFromTokenResponse = tokenResponse.headers['set-cookie'];

        // Per official docs, call /channels with no params to get the authenticated user's channel info.
        const channelResponse = await axios.get('https://api.kick.com/public/v1/channels', {
            headers: { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/json' },
        });
        const channelData = channelResponse.data.data?.[0];
        const userId = channelData?.broadcaster_user_id;
        const slug = channelData?.slug;

        // The official v1 API only provides the lowercase slug. To get the capitalized
        // display name, we will try the undocumented v2 endpoint, which is likely
        // what was working for you before. This GET request does not require a CSRF token.
        let displayName = slug; // Default to the lowercase slug
        try {
            const v2Headers = {
                'Authorization': `Bearer ${access_token}`,
                'Accept': 'application/json',
            };
            // Forwarding the cookies from the token exchange is crucial for private APIs.
            // This is the missing piece that caused the 403 Forbidden error.
            if (cookiesFromTokenResponse) {
                v2Headers['Cookie'] = cookiesFromTokenResponse.join('; ');
            }
            const v2UserResponse = await axios.get('https://kick.com/api/v2/user', { headers: v2Headers });
            const v2UserData = v2UserResponse.data;
            console.log('Received userData from Kick v2 endpoint:', JSON.stringify(v2UserData, null, 2));
            if (v2UserData?.username) {
                displayName = v2UserData.username; // Use the capitalized name if found
            }
        } catch (userError) {
            console.warn('Could not fetch display name from v2 endpoint. Falling back to slug.', userError.message);
        }

        if (!userId || !displayName) {
            console.error('Kick callback error: Could not find broadcaster_user_id or username in API responses.');
            return res.status(500).send('Could not retrieve user channel from Kick.');
        }

        res.send(`
            <script>
                window.opener.postMessage({
                    type: 'kick-auth-success',
                    accessToken: '${access_token}',
                    refreshToken: '${refresh_token}',
                    userId: '${userId}',
                    userName: '${displayName}',
                    scope: '${scope}'
                }, '${FRONTEND_URL}');
                window.close();
            </script>
        `);
    } catch (error) {
        console.error('Kick callback error:', error.response?.data || error.message);
        res.status(500).send('An error occurred during Kick authentication.');
    }
});

// Route: /api/auth/kick/refresh
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required.' });
    }
    try {
        const tokenUrl = 'https://id.kick.com/oauth/token';
        const response = await axios.post(tokenUrl, new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: KICK_CLIENT_ID,
            client_secret: KICK_CLIENT_SECRET,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const { access_token, refresh_token } = response.data;

        // The frontend interceptor expects 'access_token' and 'refresh_token'.
        res.status(200).json({ access_token, refresh_token });
    } catch (err) {
        console.error('Kick token refresh error:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json({ message: 'Failed to refresh Kick token.', error: err.response?.data || 'Internal Server Error' });
    }
});

export default router;