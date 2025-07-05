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
    let broadcasts = [];
    try {
      // Find all non-completed broadcasts to get the most relevant one
      const response = await youtube.liveBroadcasts.list({
        part: 'id,snippet,contentDetails,status',
        broadcastStatus: 'all', // Get all broadcasts to avoid missing states like 'ready'
        mine: true,
      });

      if (response.data.items && response.data.items.length > 0) {
        // Filter out any streams that are already completed or revoked.
        const nonCompleted = response.data.items.filter(
          (b) => b.status.lifeCycleStatus !== 'complete' && b.status.lifeCycleStatus !== 'revoked'
        );

        if (nonCompleted.length > 0) {
          // Prioritize the most relevant stream. 'live' is most important, then 'ready', etc.
          const statusPriority = {
            live: 1,
            ready: 2,
            testing: 3,
            created: 4,
          };

          nonCompleted.sort((a, b) => {
            const priorityA = statusPriority[a.status.lifeCycleStatus] || 99;
            const priorityB = statusPriority[b.status.lifeCycleStatus] || 99;
            if (priorityA !== priorityB) {
              return priorityA - priorityB;
            }
            // If priorities are the same, sort by scheduled start time (earliest first)
            return new Date(a.snippet.scheduledStartTime) - new Date(b.snippet.scheduledStartTime);
          });

          broadcasts = [nonCompleted[0]]; // The most relevant broadcast is the first in the sorted list
        }
      }
    } catch (broadcastError) {
      // If we get the specific "Incompatible parameters" error, we can assume there are no broadcasts
      // and safely continue to the liveStream fallback.
      const errorMessage = broadcastError.response?.data?.error?.message || '';
      if (errorMessage.includes('Incompatible parameters')) {
        console.log('Handled "Incompatible parameters" error. Proceeding to check for default stream.');
        broadcasts = []; // Ensure broadcasts is an empty array so the fallback runs
      } else {
        // If it's a different error (like auth), re-throw it to be caught by the outer block.
        throw broadcastError;
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
    console.error('Error in /api/youtube/stream/info:', error.response?.data || error.message);

    // If the error is from the Google API, it will likely have a `response` object.
    if (error.response) {
      const status = error.response.status;
      // Extract the specific error message from Google's response structure
      const message = error.response.data?.error?.errors?.[0]?.message || 
                      error.response.data?.error?.message || 
                      'An unknown error occurred while communicating with YouTube.';

      // Check for the specific "Incompatible parameters" error which often means live streaming is not enabled.
      if (status === 400 && message.includes('Incompatible parameters')) {
        const userFriendlyMessage = 'Live streaming may not be enabled on this YouTube account. Please visit youtube.com/features to check your status. It may take up to 24 hours to activate.';
        console.error('Potential issue: Live streaming not enabled for user.');
        return res.status(400).json({ error: userFriendlyMessage });
      }

      // Specifically handle 401/403 as a re-authentication request for the client
      if (status === 401 || status === 403) {
        return res.status(401).json({ error: 'Invalid or expired token. Please re-authenticate.' });
      }
      return res.status(status).json({ error: message });
    }
    // For non-API errors (e.g., network issues), return a generic 500
    res.status(500).json({ error: 'A server error occurred while fetching YouTube stream info.' });
  }
}
