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

  const { broadcastId, title, description } = req.body;
  if (!broadcastId || !title) {
    return res.status(400).json({ error: 'broadcastId and title are required' });
  }

  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2Client.setCredentials({ access_token: accessToken });

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  });

  try {
    const response = await youtube.liveBroadcasts.update({
      part: 'id,snippet',
      requestBody: {
        id: broadcastId,
        snippet: {
          title: title,
          description: description,
        },
      },
    });

    res.status(200).json({ success: true, updatedStream: response.data });
  } catch (error) {
    console.error('Error updating YouTube stream:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to update stream on YouTube' });
  }
}