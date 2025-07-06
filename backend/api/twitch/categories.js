import axios from 'axios';
import { withCors } from '../_utils/cors.js';
import { validateEnv } from '../_utils/env.js';

// Ensure required environment variables are set at initialization.
validateEnv(['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET']);
const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;

// A more robust in-memory cache for the app access token.
// In a serverless environment, this cache will persist for the lifetime of the function instance.
const tokenCache = {
  token: null,
  expiresAt: 0, // Expiration time in milliseconds
};

async function getAppAccessToken() {
  const now = Date.now();
  // Check if we have a token and it's not expired (with a 60-second buffer).
  if (tokenCache.token && now < tokenCache.expiresAt - 60000) {
    return tokenCache.token;
  }

  // If the token is missing or expired, fetch a new one.
  try {
    const response = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
      params: {
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
      },
    });
    
    const { access_token, expires_in } = response.data;
    
    // Update the cache
    tokenCache.token = access_token;
    tokenCache.expiresAt = now + (expires_in * 1000);

    return access_token;
  } catch (error) {
    console.error('Error getting Twitch App Access Token:', error.response?.data);
    // Clear the cache on failure to force a retry on the next call.
    tokenCache.token = null;
    tokenCache.expiresAt = 0;
    throw new Error('Could not authenticate with Twitch.');
  }
}

async function handler(req, res) {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }

  try {
    const token = await getAppAccessToken();
    const response = await axios.get(`https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(query)}`, {
      headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` }
    });
    res.status(200).json(response.data.data);
  } catch (error) {
    console.error('Error searching Twitch categories:', error.response?.data);
    res.status(500).json({ error: 'Failed to search Twitch categories.' });
  }
}

export default withCors(handler);
