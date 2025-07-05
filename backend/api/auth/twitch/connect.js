/**
 * Vercel Serverless Function (ESM)
 * ---
 * This function starts the Twitch OAuth2 flow by redirecting the user to the Twitch authorization URL.
 */
export default function handler(req, res) {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Origin', 'https://sheepherd1.github.io');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(204).send('');
    }
    const { TWITCH_CLIENT_ID, VITE_APP_VERCEL_URL } = process.env;

    if (!TWITCH_CLIENT_ID || !VITE_APP_VERCEL_URL) {
        console.error('Function error in twitch/connect.js: Missing TWITCH_CLIENT_ID or VITE_APP_VERCEL_URL environment variables.');
        return res.status(500).send('Server configuration error. Please contact the site administrator.');
    }

    const REDIRECT_URI = `${VITE_APP_VERCEL_URL}/api/auth/twitch/callback`;
    const TWITCH_SCOPES = 'channel:manage:broadcast openid user:read:broadcast';
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(TWITCH_SCOPES)}`;
    res.redirect(302, authUrl);
}