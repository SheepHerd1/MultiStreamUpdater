import { google } from 'googleapis';
import { withCors } from './_utils/cors.js';
import { validateEnv } from './_utils/env.js';

validateEnv(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_API_KEY']);

function getOAuth2Client(token) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  if (token) {
    oAuth2Client.setCredentials({ access_token: token });
  }
  return oAuth2Client;
}

// --- Route Handlers ---
async function handleStreamInfo(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

  try {
    const youtube = google.youtube({ version: 'v3', auth: getOAuth2Client(token) });
    const broadcastResponse = await youtube.liveBroadcasts.list({ part: 'id,snippet,contentDetails,status', broadcastStatus: 'active', broadcastType: 'all' });

    if (broadcastResponse.data.items.length > 0) {
      const broadcast = broadcastResponse.data.items[0];
      return res.status(200).json({
        id: broadcast.id,
        title: broadcast.snippet.title,
        description: broadcast.snippet.description,
        categoryId: broadcast.snippet.categoryId,
        updateType: 'broadcast',
      });
    }

    const streamResponse = await youtube.liveStreams.list({ part: 'id,snippet,cdn,status', mine: true });
    if (streamResponse.data.items.length > 0) {
      const stream = streamResponse.data.items[0];
      return res.status(200).json({
        id: stream.id,
        title: stream.snippet.title,
        description: stream.snippet.description,
        updateType: 'stream',
        message: 'No active broadcast found. Showing persistent stream info.',
      });
    }
    
    return res.status(200).json({ message: 'No active stream or broadcast found.' });
  } catch (error) {
    console.error('Error fetching YouTube stream info:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || 'Failed to fetch YouTube stream info.';
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
}

async function handleStreamUpdate(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

  const { streamId, title, description, categoryId, updateType } = req.body;
  try {
    const youtube = google.youtube({ version: 'v3', auth: getOAuth2Client(token) });
    const resource = { id: streamId, snippet: { title, description, categoryId } };

    if (updateType === 'broadcast') {
      await youtube.liveBroadcasts.update({ part: 'snippet', requestBody: resource });
    } else if (updateType === 'stream') {
      await youtube.liveStreams.update({ part: 'snippet', requestBody: resource });
    } else {
      return res.status(400).json({ error: 'Invalid update type provided.' });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating YouTube stream:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || 'Failed to update YouTube stream.';
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
}

async function handleChannelInfo(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

  try {
    const youtube = google.youtube({ version: 'v3', auth: getOAuth2Client(token) });
    // 'mine: true' fetches the channel for the authenticated user
    const response = await youtube.channels.list({ part: 'id,snippet', mine: true });
    // The API returns an array of items, we want the first one.
    res.status(200).json(response.data.items?.[0] || {});
  } catch (error) {
    console.error('Error fetching YouTube channel info:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || 'Failed to fetch YouTube channel info.';
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
}

async function handleCategories(req, res) {
  try {
    const youtube = google.youtube({ version: 'v3', auth: process.env.GOOGLE_API_KEY });
    const response = await youtube.videoCategories.list({ part: 'snippet', regionCode: 'US' });
    res.status(200).json(response.data.items);
  } catch (error) {
    console.error('Error fetching YouTube categories:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch YouTube categories.' });
  }
}

// --- Main Handler ---
async function handler(req, res) {
  const { action } = req.query;

  if (req.method === 'GET') {
    switch (action) {
      case 'stream_info':
        return handleStreamInfo(req, res);
      case 'channel_info':
        return handleChannelInfo(req, res);
      case 'categories':
        return handleCategories(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  }

  if (req.method === 'POST') {
    switch (action) {
      case 'stream_update':
        return handleStreamUpdate(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

export default withCors(handler);
