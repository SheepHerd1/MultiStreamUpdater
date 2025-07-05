import { google } from 'googleapis';

export default async function handler(req, res) {
  // --- Manual CORS Preflight Handling ---
  // This is a workaround for when vercel.json is not being applied correctly.
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', 'https://sheepherd1.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    return res.status(204).send('');
  }

  // Defensive check for environment variables to prevent a crash
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("Function crash averted in youtube/stream/info.js: Missing Google environment variables.");
    return res.status(500).json({ error: "Server configuration error. Please check credentials." });
  }

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
    // First, try to find an active live broadcast
    let response = await youtube.liveBroadcasts.list({
      part: 'id,snippet,contentDetails,status',
      broadcastStatus: 'active',
      mine: true,
      maxResults: 1,
    });

    let broadcasts = response.data.items;

    // If no active stream is found, look for upcoming ones
    if (!broadcasts || broadcasts.length === 0) {
      response = await youtube.liveBroadcasts.list({
        part: 'id,snippet,contentDetails,status',
        broadcastStatus: 'upcoming',
        mine: true,
      });
      
      if (response.data.items && response.data.items.length > 0) {
        // Sort upcoming streams to find the one scheduled soonest
        const sortedUpcoming = response.data.items.sort((a, b) => 
          new Date(a.snippet.scheduledStartTime) - new Date(b.snippet.scheduledStartTime)
        );
        broadcasts = [sortedUpcoming[0]]; // Take the soonest one
      }
    }

    // If a broadcast was found, return its info
    if (broadcasts && broadcasts.length > 0) {
      const stream = broadcasts[0];
      return res.status(200).json({
        id: stream.id,
        title: stream.snippet.title,
        description: stream.snippet.description,
        isLive: stream.status.lifeCycleStatus === 'live',
        updateType: 'broadcast', // This is a scheduled broadcast
      });
    }

    // --- Fallback: Find the user's default stream settings ("Stream Now") ---
    const liveStreamResponse = await youtube.liveStreams.list({
      part: 'id,snippet',
      mine: true,
      maxResults: 1,
    });

    if (liveStreamResponse.data.items && liveStreamResponse.data.items.length > 0) {
      const stream = liveStreamResponse.data.items[0];
      return res.status(200).json({
        id: stream.id,
        title: stream.snippet.title,
        description: stream.snippet.description,
        isLive: false, // A stream key itself is not considered 'live'
        updateType: 'stream', // This is a persistent stream key
      });
    }

    // If no broadcasts or streams are found at all
    return res.status(200).json({ message: 'No active, upcoming, or default YouTube stream found.' });
  } catch (error) {
    console.error('Error fetching YouTube stream info:', error.response?.data || error.message);
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(401).json({ error: 'Invalid or expired token. Please re-authenticate.' });
    }
    res.status(500).json({ error: 'Failed to fetch stream info from YouTube' });
  }
}
