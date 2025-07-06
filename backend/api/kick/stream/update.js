import axios from 'axios';
import { withCors } from '../../_utils/cors';

// This endpoint updates the channel's stream information.
// It requires an authenticated user token.
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization token not provided.' });
  }

  const { channel, title, category } = req.body;

  if (!channel) {
    return res.status(400).json({ error: 'Channel is required.' });
  }
  if (!title && !category) {
    return res.status(400).json({ error: 'Either title or category is required to update.' });
  }

  try {
    // NOTE: This endpoint URL should be confirmed from the official Kick API documentation.
    const kickApiUrl = `https://kick.com/api/v2/channels/${channel}`;

    const payload = {
      session_title: title,
      category_name: category,
    };

    await axios.patch(kickApiUrl, payload, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });

    res.status(200).json({ success: true, message: 'Kick stream updated successfully.' });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to update Kick stream info.';
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
}

export default withCors(handler);