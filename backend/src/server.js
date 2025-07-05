require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 8080;

// --- CONFIGURATION ---
const {
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    FRONTEND_URL
} = process.env;

const TWITCH_REDIRECT_URI = `${FRONTEND_URL}/api/auth/twitch/callback`;
const YOUTUBE_REDIRECT_URI = `${FRONTEND_URL}/api/auth/youtube/callback`;

const youtubeOauth2Client = new google.auth.OAuth2(
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    YOUTUBE_REDIRECT_URI
);

app.use(cors({ origin: FRONTEND_URL }));

// --- AUTHENTICATION ROUTES ---

// 1. Twitch Login: Redirects user to Twitch to authorize
app.get('/api/auth/twitch', (req, res) => {
    const params = new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        redirect_uri: TWITCH_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid user:read:email channel:manage:broadcast',
    });
    const authUrl = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
    res.redirect(authUrl);
});

// 2. Twitch Callback: Twitch redirects here after authorization
app.get('/api/auth/twitch/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Error: No code received from Twitch.');
    }

    try {
        // Exchange the code for tokens
        const tokenParams = new URLSearchParams({
            client_id: TWITCH_CLIENT_ID,
            client_secret: TWITCH_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: TWITCH_REDIRECT_URI,
        });

        const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            body: tokenParams,
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokenData.message || 'Failed to get Twitch tokens');
        }

        // Redirect to the frontend handler with tokens in the URL hash
        const frontendRedirectParams = new URLSearchParams({
            platform: 'twitch',
            token: tokenData.access_token,
            id_token: tokenData.id_token, // Your App.js uses this
        });
        res.redirect(`${FRONTEND_URL}/auth-handler.html#${frontendRedirectParams.toString()}`);

    } catch (error) {
        console.error('Twitch auth callback error:', error);
        res.status(500).send('An error occurred during Twitch authentication.');
    }
});

// 3. YouTube Login: Redirects user to Google to authorize
app.get('/api/auth/youtube', (req, res) => {
    // DEBUG: Log the exact URI being used for the Google auth URL
    console.log('Generating YouTube Auth URL with Redirect URI:', YOUTUBE_REDIRECT_URI);

    const authUrl = youtubeOauth2Client.generateAuthUrl({
        access_type: 'offline', // Required to get a refresh token
        scope: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube'],
        prompt: 'consent', // Ensures the user is prompted and we get a refresh token
    });
    res.redirect(authUrl);
});

// 4. YouTube Callback: Google redirects here after authorization
app.get('/api/auth/youtube/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await youtubeOauth2Client.getToken(code);
        youtubeOauth2Client.setCredentials(tokens);

        // Get user's channel info to provide a username
        const youtube = google.youtube('v3');
        const channelResponse = await youtube.channels.list({
            auth: youtubeOauth2Client,
            part: 'snippet',
            mine: true,
        });

        const channel = channelResponse.data.items[0];
        const authData = {
            token: tokens.access_token,
            userName: channel.snippet.title,
            // We will store the full tokens object in localStorage on the client
            tokens: JSON.stringify(tokens),
        };

        const frontendRedirectParams = new URLSearchParams({
            platform: 'youtube',
            ...authData,
        });
        res.redirect(`${FRONTEND_URL}/auth-handler.html#${frontendRedirectParams.toString()}`);
    } catch (error) {
        console.error('YouTube auth callback error:', error.message);
        res.status(500).send('An error occurred during YouTube authentication.');
    }
});

// This is for local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server listening on http://localhost:${PORT}`);
    });
}

module.exports = app; // Export the app for Vercel