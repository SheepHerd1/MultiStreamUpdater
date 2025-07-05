import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  const accessToken = authHeader.split(' ')[1];

  const { streamId, title, description, updateType } = req.body;
  if (!streamId || !title || !updateType) {
    return res.status(400).json({ error: 'streamId, title, and updateType are required' });
  }

  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2Client.setCredentials({ access_token: accessToken });

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  });

  try {
    let response;
    if (updateType === 'broadcast') {
      response = await youtube.liveBroadcasts.update({
        part: 'id,snippet',
        requestBody: {
          id: streamId,
          snippet: {
            title: title,
            description: description,
          },
        },
      });
    } else if (updateType === 'stream') {
      response = await youtube.liveStreams.update({
        part: 'id,snippet',
        requestBody: {
          id: streamId,
          snippet: {
            title: title,
            description: description,
          },
        },
      });
    } else {
      return res.status(400).json({ error: `Invalid updateType: ${updateType}` });
    }

    res.status(200).json({ success: true, updatedStream: response.data });
  } catch (error) {
    console.error('Error updating YouTube stream:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ error: 'Failed to update stream on YouTube' });
  }
}
