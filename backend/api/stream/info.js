const axios = require('axios');
const { TWITCH_CLIENT_ID } = process.env;
const { handleTwitchApiError } = require('../_utils/errorHandler');

module.exports = async (req, res) => {
    const { broadcaster_id, token } = req.query;

    if (!broadcaster_id || !token) {
        return res.status(400).json({ message: 'Missing required query parameters.' });
    }

    try {
        const response = await axios.get(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id}`, {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`,
            }
        });

        const channelInfo = response.data.data[0];
        res.status(200).json(channelInfo);

    } catch (error) {
        const errorMessage = handleTwitchApiError(error, 'Failed to fetch stream info.');
        res.status(500).json({ message: errorMessage });
    }
};