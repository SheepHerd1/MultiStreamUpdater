/**
 * Vercel Serverless Function (ESM)
 * ---
 * This function starts the Twitch OAuth2 flow by redirecting the user to the Twitch authorization URL.
 */
export default function handler(req, res) {
    const {
        TWITCH_CLIENT_ID,
        VITE_APP_VERCEL_URL // Your Vercel deployment URL
    } = process.env;

    // This is the full URL to your NEW callback function on Vercel
    const REDIRECT_URI = `${VITE_APP_VERCEL_URL}/api/auth/twitch-callback`;
    const TWITCH_SCOPES = 'channel:manage:broadcast openid user:read:broadcast';

    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(TWITCH_SCOPES)}`;

    // Redirect the popup window to Twitch for authorization
    res.redirect(302, authUrl);
}