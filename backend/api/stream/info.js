// Use ES Module syntax to match the project's configuration ("type": "module" in package.json)
import axios from 'axios';
import { allowCors } from '../_middleware/cors.js';

const { TWITCH_CLIENT_ID } = process.env;

const handler = async (req, res) => {
    // Defensive check for environment variables to prevent a crash
    if (!TWITCH_CLIENT_ID) {
        console.error("Function crash averted in info.js: Missing TWITCH_CLIENT_ID environment variable.");
        return res.status(500).json({ message: "Server configuration error." });
    }

    // --- Securely get the token from the Authorization header ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization header is missing or malformed. It must be "Bearer [token]".' });
    }
    const token = authHeader.split(' ')[1];
    // --- Get the broadcaster ID from the query parameter ---
    const { broadcaster_id } = req.query;

    if (!broadcaster_id) {
        return res.status(400).json({ message: 'Missing required query parameter: broadcaster_id.' });
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

// Wrap the handler with the CORS middleware and export it
export default allowCors(handler);