import express from 'express';
import { google } from 'googleapis';

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_API_KEY } = process.env;
const router = express.Router();

function getOAuth2Client(token) {
  const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  if (token) {
    oAuth2Client.setCredentials({ access_token: token });
  }
  return oAuth2Client;
}

// --- Route Handlers ---

router.get('/', async (req, res) => {
  const { action } = req.query;
  const token = req.headers.authorization?.split(' ')[1];

  try {
    switch (action) {
      case 'stream_info': {
        if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });
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
      }

      case 'channel_info': {
        if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });
        const youtube = google.youtube({ version: 'v3', auth: getOAuth2Client(token) });
        const response = await youtube.channels.list({ part: 'id,snippet', mine: true });
        return res.status(200).json(response.data.items?.[0] || {});
      }

      case 'categories': {
        const youtube = google.youtube({ version: 'v3', auth: GOOGLE_API_KEY });
        const response = await youtube.videoCategories.list({ part: 'snippet', regionCode: 'US' });
        return res.status(200).json(response.data.items);
      }

      default:
        return res.status(400).json({ error: 'Invalid GET action' });
    }
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error?.message || `Failed to perform YouTube action: ${action}.`;
    console.error(`[YouTube GET Error] Action: ${action}, Status: ${status}`, error.message);
    return res.status(status).json({ error: message });
  }
});

router.post('/', async (req, res) => {
  const { action } = req.query;
  const token = req.headers.authorization?.split(' ')[1];

  try {
    switch (action) {
      case 'stream_update': {
        if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });
        const { streamId, title, description, categoryId, updateType } = req.body;
        const youtube = google.youtube({ version: 'v3', auth: getOAuth2Client(token) });
        const resource = { id: streamId, snippet: { title, description, categoryId } };

        if (updateType === 'broadcast') {
          await youtube.liveBroadcasts.update({ part: 'snippet', requestBody: resource });
        } else if (updateType === 'stream') {
          await youtube.liveStreams.update({ part: 'snippet', requestBody: resource });
        } else {
          return res.status(400).json({ error: 'Invalid update type provided.' });
        }
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ error: 'Invalid POST action' });
    }
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error?.message || `Failed to perform YouTube action: ${action}.`;
    console.error(`[YouTube POST Error] Action: ${action}, Status: ${status}`, error.message);
    return res.status(status).json({ error: message });
  }
});

export default router;