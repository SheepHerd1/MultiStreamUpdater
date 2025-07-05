import axios from 'axios';

const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;

let appAccessToken = null;

async function getAppAccessToken() {
  // If we already have a valid token, reuse it.
  // In a real-world, high-traffic app, you'd also check for expiration.
  if (appAccessToken) return appAccessToken;

  try {
    const response = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`);
    appAccessToken = response.data.access_token;
    return appAccessToken;
  } catch (error) {
    console.error('Error getting Twitch App Access Token:', error.response?.data);
    throw new Error('Could not authenticate with Twitch.');
  }
}

export default async function handler(req, res) {
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