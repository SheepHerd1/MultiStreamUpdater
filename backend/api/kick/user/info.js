import axios from 'axios';
import { withCors } from '../../_utils/cors.js';

async function handler(req, res) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authorization token not provided.' });
  }

  try {
    // NOTE: This endpoint URL should be confirmed from the official Kick API documentation.
    // This is a standard endpoint for getting the authenticated user's profile.
    const kickApiUrl = 'https://kick.com/api/v2/user';

    const response = await axios.get(kickApiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching Kick user info:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch user info from Kick.' });
  }
}

export default withCors(handler);