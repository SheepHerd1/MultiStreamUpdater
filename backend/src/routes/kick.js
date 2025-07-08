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
          const { channel: channelSlug } = req.query;
          if (!channelSlug) return res.status(400).json({ message: 'Channel slug is required.' });
          
          const url = `${KICK_API_V1_BASE}/channels?slug=${encodeURIComponent(channelSlug)}`;
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
    const headers = {
      'Authorization': `Bearer ${req.kickAccessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  
    try {
      const { channel, title, category } = req.body;
      if (!channel) return res.status(400).json({ message: 'Channel slug is required.' });

      let categoryId = null;
      // If a category name is provided, we must find its ID to use with the update endpoint.
      if (category) {
        const searchUrl = `${KICK_API_V1_BASE}/categories?q=${encodeURIComponent(category)}`;
        const searchResponse = await axios.get(searchUrl, { headers });
        // Find an exact, case-insensitive match for the category name.
        const foundCategory = searchResponse.data?.data?.find(c => c.name.toLowerCase() === category.toLowerCase());
        
        if (foundCategory) {
          categoryId = foundCategory.id;
        } else {
          return res.status(400).json({ message: `Category '${category}' could not be found on Kick.` });
        }
      }

      // The v2 endpoint for updating a livestream expects a PATCH request for updates.
      const updateUrl = `${KICK_API_V2_BASE}/channels/${encodeURIComponent(channel)}/livestream`;
      const updatePayload = { session_title: title, category_id: categoryId };

      const response = await axios.patch(updateUrl, updatePayload, { headers });
      return res.status(response.status).json({ success: true });
    } catch (err) {
      const status = err.response?.status || 500;
      const data = err.response?.data || { message: 'An internal proxy error occurred.' };
      console.error(`[Kick Update Error] Status: ${status}`, data);
      return res.status(status).json(data);
    }
  });

export default router;