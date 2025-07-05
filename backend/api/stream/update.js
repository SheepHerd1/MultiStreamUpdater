import axios from 'axios';

const { TWITCH_CLIENT_ID } = process.env;

// Helper function to get a game ID from a game name
async function getTwitchGameId(gameName, appAccessToken) {
  // If the user didn't enter a category, we don't need to change it.
  if (!gameName) return undefined;

  try {
    const response = await axios.get('https://api.twitch.tv/helix/games', {
      params: { name: gameName },
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${appAccessToken}`,
      },
    });
    // Return the ID of the first match. If no match is found, return undefined so the category is not changed.
    return response.data.data[0]?.id;
  } catch (error) {
    console.error('Error fetching Twitch game ID:', error.response ? error.response.data : error.message);
    return undefined; // Return undefined to avoid changing the category on error
  }
}

// Helper function to update Twitch
async function updateTwitch(authToken, broadcasterId, { title, gameId, tags }) {
  const payload = {
    title: title,
    game_id: gameId,
    tags: tags,
  };

  // Remove any keys that are undefined so we don't overwrite existing values with nulls.
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

  await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, payload, {
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });
}

const handler = async (req, res) => {
  // --- Manual CORS Preflight Handling ---
  // This is a workaround for when vercel.json is not being applied correctly.
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', 'https://sheepherd1.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    return res.status(204).send('');
  }

  // Defensive check for environment variables to prevent a crash
  if (!TWITCH_CLIENT_ID) {
    console.error("Function crash averted in update.js: Missing TWITCH_CLIENT_ID environment variable.");
    return res.status(500).json({ message: "Server configuration error." });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // --- Securely get the token from the Authorization header ---
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header is missing or malformed.' });
  }
  const token = authHeader.split(' ')[1];

  // Get the rest of the data from the request body
  const { title, category, tags, broadcasterId } = req.body;
  const results = {};

  // If no broadcasterId is provided, we can't update Twitch.
  // This prevents the API from failing silently.
  if (!broadcasterId) {
      // For now, we'll return an error if the primary target is missing data.
      return res.status(400).json({ message: 'Missing required field in request body: broadcasterId' });
  }

  // --- Twitch Update ---
  // Check for the necessary data. The token comes from the header, the ID from the body.
  if (token && broadcasterId) {
    try {
      const gameId = await getTwitchGameId(category, token);
      await updateTwitch(token, broadcasterId, { title, gameId, tags });
      results.twitch = { success: true };
    } catch (error) {
      console.error("Error updating Twitch:", error.response ? error.response.data : error.message);
      const status = error.response ? error.response.status : 500;
      const message = error.response ? error.response.data.message : 'Failed to update Twitch.';
      results.twitch = { success: false, error: message };
      // We will send the overall status based on the first error encountered
      return res.status(status).json(results);
    }
  }

  // --- Add other platforms (YouTube, Kick, etc.) here ---

  res.status(200).json(results);
};

export default handler;