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
        // GET /users: If no user IDs are specified, returns the currently authorised user.
        console.log(`[Kick Proxy] Forwarding to GET ${kickApiBase}/users`);
        response = await axios.get(`${kickApiBase}/users`, { headers });
        // The API returns an array, we want the first user object
        res.status(200).json(response.data.data?.[0] || {});
        break;

      case 'channel_info':
        // GET /channels: If no params, returns the currently authenticated user's channel.
        console.log(`[Kick Proxy] Forwarding to GET ${kickApiBase}/channels`);
        response = await axios.get(`${kickApiBase}/channels`, { headers });
        // The API returns an array, we want the first channel object
        res.status(200).json(response.data.data?.[0] || {});
        break;
      
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

