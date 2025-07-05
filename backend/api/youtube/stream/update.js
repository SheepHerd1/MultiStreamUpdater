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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  const accessToken = authHeader.split(' ')[1];

  const { streamId, title, description, updateType, categoryId } = req.body;
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
    const requestBody = {
      id: streamId,
      snippet: {
        title: title,
        description: description,
        categoryId: categoryId,
      },
    };

    // Clean the body: if a value is undefined or an empty string, don't send it, so we don't overwrite with empty values.
    if (!requestBody.snippet.description) { delete requestBody.snippet.description; }
    if (!requestBody.snippet.categoryId) { delete requestBody.snippet.categoryId; }

    let response;
    if (updateType === 'broadcast') {
      response = await youtube.liveBroadcasts.update({
        part: 'snippet', // Correct: Only specify the part being updated.
        requestBody: requestBody,
      });
    } else if (updateType === 'stream') {
      response = await youtube.liveStreams.update({
        part: 'snippet', // Correct: Only specify the part being updated.
        requestBody: requestBody,
      });
    } else {
      return res.status(400).json({ error: `Invalid updateType: ${updateType}` });
    }

    res.status(200).json({ success: true, updatedStream: response.data });
  } catch (error) {
    console.error('Error in /api/youtube/stream/update:', error.response?.data || error.message);

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.errors?.[0]?.message ||
                      error.response.data?.error?.message ||
                      'An unknown error occurred while updating on YouTube.';
      
      if (status === 401 || status === 403) {
        return res.status(401).json({ error: 'Invalid or expired token. Please re-authenticate.' });
      }
      return res.status(status).json({ error: message });
    }
    res.status(500).json({ error: 'A server error occurred while updating the YouTube stream.' });
  }
}
