const axios = require('axios');
const { TWITCH_CLIENT_ID } = process.env;
const { handleTwitchApiError } = require('../_utils/errorHandler');

// Helper function to get a game ID from a game name
async function getTwitchGameId(gameName, appAccessToken) {
    // If the user didn't enter a category, we don't need to change it.
    if (!gameName) return undefined;

    try {
        const response = await axios.get('https://api.twitch.tv/helix/games', {
            params: { name: gameName },
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${appAccessToken}`
            },
        });
        // Return the ID of the first match. If no match is found, return undefined so the category is not changed.
        return response.data.data[0]?.id;
    } catch (error) {
        console.error("Error fetching Twitch game ID:", error.response ? error.response.data : error.message);
        return undefined; // Return undefined to avoid changing the category on error
    }
}

// Helper function to update Twitch
async function updateTwitch(authToken, broadcasterId, title, gameId) {
    await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, {
        title: title,
        game_id: gameId
    }, {
        headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    });
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { title, category, tags, twitchAuth } = req.body;
    const results = {};

    // --- Twitch Update ---
    if (twitchAuth && twitchAuth.token && twitchAuth.userId) {
        try {
            // Dynamically look up the game ID from the category name.
            const gameId = await getTwitchGameId(category, twitchAuth.token);

            await updateTwitch(twitchAuth.token, twitchAuth.userId, title, gameId);
            results.twitch = { success: true };
        } catch (error) {
            const errorMessage = handleTwitchApiError(error, 'Failed to update Twitch.');
            results.twitch = { success: false, error: errorMessage };
        }
    }

    // --- Add other platforms (YouTube, Kick, etc.) here ---

    res.status(200).json(results);
};