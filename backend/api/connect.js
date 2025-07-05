import { google } from 'googleapis';

// This function will be hosted at /api/auth/youtube/connect
export default function handler(req, res) {
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