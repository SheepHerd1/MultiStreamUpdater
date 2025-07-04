const axios = require('axios');

const { TWITCH_CLIENT_ID } = process.env;

// Helper function to update Twitch
async function updateTwitch(authToken, broadcasterId, title, gameId) {
    await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, {
        title: title,
        game_id: gameId,
    }, {
        headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
        },
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
            // In a real app, you'd look up the gameId from the category name
            const gameId = "509658"; // Example: "Just Chatting"
            await updateTwitch(twitchAuth.token, twitchAuth.userId, title, gameId);
            results.twitch = { success: true };
        } catch (error) {
            console.error("Twitch API Error:", error.response ? error.response.data : error.message);
            results.twitch = { success: false, error: 'Failed to update Twitch.' };
        }
    }

    // --- Add other platforms (YouTube, Kick, etc.) here ---

    res.status(200).json(results);
};