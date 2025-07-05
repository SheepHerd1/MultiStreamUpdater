// Use ES Module syntax to match the project's configuration ("type": "module" in package.json)
import axios from 'axios';
// NOTE: Your _utils/errorHandler.js may also need to be converted to an ES Module.
// For now, we'll use simplified error handling directly in this file.

const { TWITCH_CLIENT_ID } = process.env;

export default async (req, res) => {
    // --- CORS Headers ---
    // These headers must be on every response, not just the OPTIONS preflight.
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', 'https://sheepherd1.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        // CRITICAL FIX: Added 'Authorization' to the list of allowed headers.
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // Handle the browser's preflight OPTIONS request.
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const { broadcaster_id, token } = req.query;

    if (!broadcaster_id || !token) {
        return res.status(400).json({ message: 'Missing required query parameters: broadcaster_id and token.' });
    }

    try {
        const response = await axios.get(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id}`, {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            }
        });

        const channelInfo = response.data.data[0];
        res.status(200).json(channelInfo);
    } catch (error) {
        console.error("Error fetching from Twitch API:", error.response ? error.response.data : error.message);
        const status = error.response ? error.response.status : 500;
        const message = error.response ? error.response.data.message : 'Failed to fetch stream info.';
        res.status(status).json({ message });
    }
};