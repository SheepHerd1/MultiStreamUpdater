import axios from 'axios';
import { withCors } from './_utils/cors.js';

// A simple proxy to the official Kick API.
// This centralizes API calls and ensures the correct, documented endpoints are used.
async function handler(req, res) {
  const { action } = req.query;
  const accessToken = req.headers.authorization?.split(' ')[1];

  if (!accessToken) {
    return res.status(401).json({ message: 'Unauthorized: Missing access token.' });
  }

  const kickApiBase = 'https://api.kick.com/public/v1';
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  try {
    let response;
    switch (action) {
      case 'user_info':
        // To provide a complete object, we'll fetch from both /users and /channels and merge them.
        console.log(`[Kick Proxy] Fetching from GET ${kickApiBase}/users`);
        const userResponse = await axios.get(`${kickApiBase}/users`, { headers });
        const userInfo = userResponse.data.data?.[0];

        if (!userInfo) {
          return res.status(404).json({ message: 'User not found via Kick API.' });
        }

        console.log(`[Kick Proxy] Fetching from GET ${kickApiBase}/channels`);
        const channelResponse = await axios.get(`${kickApiBase}/channels`, { headers });
        const channelInfo = channelResponse.data.data?.[0];

        // Merge the two objects. The channel info is the primary source of stream data.
        const combinedInfo = {
          ...(userInfo || {}),
          ...(channelInfo || {}),
        };

        console.log('[Kick Proxy] Returning combined user/channel info:', combinedInfo);
        res.status(200).json(combinedInfo);
        break;

      case 'channel_info':
        // This action is still useful for fetching only channel data, e.g., for live status updates.
        console.log(`[Kick Proxy] Forwarding to GET ${kickApiBase}/channels`);
        response = await axios.get(`${kickApiBase}/channels`, { headers });
        // The API returns an array, we want the first channel object.
        res.status(200).json(response.data.data?.[0] || {});
        break;
      
      case 'stream_info': {
        const { channel: channelSlug } = req.query;
        if (!channelSlug) {
          return res.status(400).json({ message: 'Channel slug is required for stream_info action.' });
        }
        console.log(`[Kick Proxy] Forwarding to GET ${kickApiBase}/channels with slug: ${channelSlug}`);
        // The Kick API uses the 'slug' query parameter to find a channel by its name.
        const url = `${kickApiBase}/channels?slug=${encodeURIComponent(channelSlug)}`;
        response = await axios.get(url, { headers });
        // The API returns an array, we want the first channel object.
        res.status(200).json(response.data.data?.[0] || {});
        break;
      }

      case 'update_stream':
        if (req.method !== 'PATCH') {
            return res.status(405).json({ message: 'Method Not Allowed for this action.' });
        }
        console.log(`[Kick Proxy] Forwarding to PATCH ${kickApiBase}/channels with body:`, req.body);
        response = await axios.patch(`${kickApiBase}/channels`, req.body, { headers });
        res.status(response.status).send(); // Should be 204 No Content on success
        break;

      default:
        res.status(400).json({ message: 'Invalid action specified.' });
        break;
    }
  } catch (err) {
    console.error(`[Kick Proxy] Error for action "${action}":`, { message: err.message, status: err.response?.status, data: err.response?.data });
    res.status(err.response?.status || 500).json(err.response?.data || { message: 'An internal proxy error occurred.' });
  }
}

export default withCors(handler);
