import { google } from 'googleapis';

export default async function handler(req, res) {
  // We need an API key for this public data endpoint.
  if (!process.env.GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Server is missing Google API Key configuration.' });
  }

  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.GOOGLE_API_KEY,
    });

    const response = await youtube.videoCategories.list({
      part: 'snippet',
      regionCode: 'US', // You can change this to any region code
    });

    res.status(200).json(response.data.items);
  } catch (error) {
    console.error('Error fetching YouTube categories:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch YouTube categories.' });
  }
}