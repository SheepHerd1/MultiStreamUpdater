import axios from 'axios';
import { withCors } from '../../_utils/cors';

// This endpoint fetches public channel data.
// An auth header is passed from the frontend but not required by this specific Kick API endpoint,
// however, it's good practice for our backend to know the call is from an authenticated user.
async function handler(req, res) {
  const { channel } = req.query;

  if (!channel) {
    return res.status(400).json({ error: 'Channel parameter is required.' });
  }

  try {
    // NOTE: This endpoint URL is based on official Kick API documentation.
    const kickApiUrl = `https://kick.com/api/v2/channels/${channel}`;

    const response = await axios.get(kickApiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    // The relevant data is nested inside the 'livestream' object if the user is live.
    const livestreamData = response.data.livestream || {};

    res.status(200).json(livestreamData);
  } catch (error) {
    console.error('Error fetching Kick channel info:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch channel info from Kick.' });
  }
}

export default withCors(handler);