import { google } from 'googleapis';

// This function will be hosted at /api/auth/youtube/connect
export default function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', 'https://sheepherd1.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).send('');
  }

  // Pre-flight check for required environment variables
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.YOUTUBE_REDIRECT_URI) {
    console.error("Missing Google OAuth environment variables.");
    res.status(500).send("Server configuration error. Unable to connect to YouTube.");
    return;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  );

  // Scopes determine what your app can do on the user's behalf
  const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly', // to view stream info
    'https://www.googleapis.com/auth/youtube.force-ssl'  // to update stream info
  ];

  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // 'offline' is required to get a refresh token
    scope: scopes,
  });

  res.redirect(302, authorizationUrl);
}