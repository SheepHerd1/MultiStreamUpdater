import express from 'express';
import axios from 'axios';

const router = express.Router();
const KICK_API_V1_BASE = 'https://api.kick.com/public/v1';
const KICK_API_V2_BASE = 'https://kick.com/api/v2'; // The endpoint for updates is on v2

// Middleware to check for the access token on all Kick routes.
// This cleans up the handlers by centralizing the authorization check.
router.use((req, res, next) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).json({ message: 'Unauthorized: Missing access token.' });
  }
  // Attach the token to the request object so handlers can use it.
  req.kickAccessToken = accessToken;
  next();
});

// Define a single route handler for the root path '/' that handles different methods.
router.route('/')
  .get(async (req, res) => {
    const { action } = req.query;
    const headers = {
      'Authorization': `Bearer ${req.kickAccessToken}`,
      'Accept': 'application/json',
    };

    try {
      switch (action) {
        case 'user_info': {
          const userResponse = await axios.get(`${KICK_API_V1_BASE}/users`, { headers });
          return res.status(200).json(userResponse.data.data?.[0] || {});
        }
        case 'stream_info': {
          const { broadcaster_user_id } = req.query;
          if (!broadcaster_user_id) return res.status(400).json({ message: 'broadcaster_user_id is required.' });
          // Making the lookup explicit by ID, similar to the working Twitch implementation.
          const url = `${KICK_API_V1_BASE}/channels?broadcaster_user_id=${broadcaster_user_id}`;
          const response = await axios.get(url, { headers });
          return res.status(200).json(response.data.data?.[0] || {});
        }
        case 'search_categories': {
          const { q } = req.query;
          if (!q) return res.status(400).json({ message: 'Search query "q" is required.' });

          const url = `${KICK_API_V1_BASE}/categories?q=${encodeURIComponent(q)}`;
          const response = await axios.get(url, { headers });
          return res.status(200).json(response.data);
        }
        default:
          return res.status(400).json({ message: `Invalid GET action specified: '${action}'` });
      }
    } catch (err) {
      const status = err.response?.status || 500;
      const data = err.response?.data || { message: 'An internal proxy error occurred.' };
      console.error(`[Kick GET Error] Action: "${action}", Status: ${status}`, data);
      return res.status(status).json(data);
    }
  })
  .patch(async (req, res) => {
    try {
      // According to official docs, the PATCH endpoint updates the authenticated user's channel.
      const { title, categoryId } = req.body;
      
      const headers = {
        'Authorization': `Bearer ${req.kickAccessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

      // Construct the payload. The Kick API should only update the fields that are present.
      const updatePayload = {};
      if (title !== undefined) updatePayload.stream_title = title;
      // A categoryId of null might be used to unset the category. We'll pass it along if it exists.
      if (categoryId !== undefined) updatePayload.category_id = categoryId;

      // The official documented endpoint for updating a livestream.
      const updateUrl = `${KICK_API_V1_BASE}/channels`;
      await axios.patch(updateUrl, updatePayload, { headers });
      return res.status(204).send();
    } catch (err) {
      const status = err.response?.status || 500;
      const data = err.response?.data || { message: 'An internal proxy error occurred.' };
      console.error(`[Kick Update Error] Failed to update channel. Status: ${status}`, data);
      return res.status(status).json(data);
    }
  });

export default router;