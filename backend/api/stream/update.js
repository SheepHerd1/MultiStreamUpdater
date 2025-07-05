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

export default async (req, res) => {
  // --- CORS Headers ---
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://sheepherd1.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle the browser's preflight OPTIONS request.
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { title, category, tags, twitchAuth } = req.body;
  const results = {};

  // --- Twitch Update ---
  if (twitchAuth && twitchAuth.token && twitchAuth.userId) {
    try {
      const gameId = await getTwitchGameId(category, twitchAuth.token);
      await updateTwitch(twitchAuth.token, twitchAuth.userId, { title, gameId, tags });
      results.twitch = { success: true };
    } catch (error) {
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