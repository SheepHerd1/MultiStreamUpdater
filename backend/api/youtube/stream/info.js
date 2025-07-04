import { google } from 'googleapis';

export default async function handler(req, res) {
  // --- Manual CORS Preflight Handling ---
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', 'https://sheepherd1.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    return res.status(204).send('');
  }

  // Defensive check for environment variables
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
    // Fetch all of the user's broadcasts and we will filter them in our code.
    // The `broadcastStatus` parameter is removed to avoid the "Incompatible parameters" API error.
    const broadcastResponse = await youtube.liveBroadcasts.list({
      part: 'id,snippet,contentDetails,status',
      mine: true,
    });

    let relevantBroadcast = null;

    if (broadcastResponse.data.items && broadcastResponse.data.items.length > 0) {
      const nonCompleted = broadcastResponse.data.items.filter(
        b => b.status.lifeCycleStatus !== 'complete' && b.status.lifeCycleStatus !== 'revoked'
      );

      if (nonCompleted.length > 0) {
        // Define the priority of different live states
        const statusPriority = {
          'live': 1,
          'ready': 2,
          'testing': 3,
          'created': 4,
        };

        // Sort the broadcasts to find the most important one
        nonCompleted.sort((a, b) => {
          const priorityA = statusPriority[a.status.lifeCycleStatus] || 99;
          const priorityB = statusPriority[b.status.lifeCycleStatus] || 99;

          // If status is different, sort by priority
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          // If status is the same, sort by schedule time (earliest first)
          return new Date(a.snippet.scheduledStartTime) - new Date(b.snippet.scheduledStartTime);
        });

        // The most relevant broadcast is the first one in the sorted list
        relevantBroadcast = nonCompleted[0];
      }
    }

    // If we found a relevant broadcast, return its details
    if (relevantBroadcast) {
      return res.status(200).json({
        id: relevantBroadcast.id,
        title: relevantBroadcast.snippet.title,
        description: relevantBroadcast.snippet.description,
        isLive: relevantBroadcast.status.lifeCycleStatus === 'live',
        categoryId: relevantBroadcast.snippet.categoryId,
        updateType: 'broadcast',
      });
    }

    // --- Fallback: If no relevant broadcast, find the default stream settings ---
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
        isLive: false,
        categoryId: stream.snippet.categoryId,
        updateType: 'stream',
      });
    }

    // If nothing is found at all
    return res.status(200).json({ message: 'No active, upcoming, or default YouTube stream found.' });

  } catch (error) {
    console.error('Error in /api/youtube/stream/info:', error.response?.data || error.message);

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.errors?.[0]?.message || 
                      error.response.data?.error?.message || 
                      'An unknown error occurred while communicating with YouTube.';

      if (status === 400 && message.includes('Incompatible parameters')) {
        const userFriendlyMessage = 'Live streaming may not be enabled on this YouTube account. Please visit youtube.com/features to check your status. It may take up to 24 hours to activate.';
        console.error('Potential issue: Live streaming not enabled for user.');
        return res.status(400).json({ error: userFriendlyMessage });
      }

      if (status === 401 || status === 403) {
        return res.status(401).json({ error: 'Invalid or expired token. Please re-authenticate.' });
      }
      return res.status(status).json({ error: message });
    }
    res.status(500).json({ error: 'A server error occurred while fetching YouTube stream info.' });
  }
}
