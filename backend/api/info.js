import { google } from 'googleapis';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  const accessToken = authHeader.split(' ')[1];

  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2Client.setCredentials({ access_token: accessToken });

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  });

  try {
    // Find the user's active live broadcast
    const response = await youtube.liveBroadcasts.list({
      part: 'id,snippet,contentDetails,status',
      broadcastStatus: 'active',
      mine: true,
    });

    const liveBroadcasts = response.data.items;
    if (!liveBroadcasts || liveBroadcasts.length === 0) {
      return res.status(200).json({ message: 'No active YouTube stream found.' });
    }

    const stream = liveBroadcasts[0];
    res.status(200).json({
      id: stream.id,
      title: stream.snippet.title,
      description: stream.snippet.description,
      isLive: stream.status.lifeCycleStatus === 'live',
    });
  } catch (error) {
    console.error('Error fetching YouTube stream info:', error.response?.data || error.message);
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(401).json({ error: 'Invalid or expired token. Please re-authenticate.' });
    }
    res.status(500).json({ error: 'Failed to fetch stream info from YouTube' });
  }
}