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
app.use(express.json()); // Add this to parse JSON request bodies

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

// --- STREAM METADATA ROUTES ---

// Get current stream info for connected platforms
app.post('/api/stream/info', async (req, res) => {
    const { twitchAuth, youtubeAuth } = req.body;
    const results = {};

    // Fetch from Twitch
    if (twitchAuth?.token) {
        try {
            const twitchHeaders = {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${twitchAuth.token}`,
            };
            const twitchResponse = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${twitchAuth.userId}`, { headers: twitchHeaders });
            if (!twitchResponse.ok) throw new Error(`Twitch API error: ${twitchResponse.statusText}`);
            
            const twitchData = await twitchResponse.json();
            if (twitchData.data.length > 0) {
                const channel = twitchData.data[0];
                results.twitch = {
                    title: channel.title,
                    // Twitch doesn't have a separate "description". The "About" panel isn't editable via this API.
                    description: `Currently streaming: ${channel.game_name}.`, 
                };
            } else {
                results.twitch = { error: 'Twitch channel not found.' };
            }
        } catch (error) {
            console.error('Twitch API Error:', error.message);
            results.twitch = { error: 'Failed to fetch from Twitch.' };
        }
    }

    // Fetch from YouTube
    if (youtubeAuth?.tokens) {
        try {
            const tokens = JSON.parse(youtubeAuth.tokens);
            youtubeOauth2Client.setCredentials(tokens);

            const youtube = google.youtube('v3');
            // Find the user's most recent stream, whether it's active or upcoming
            const response = await youtube.liveBroadcasts.list({
                auth: youtubeOauth2Client,
                part: 'id,snippet',
                broadcastStatus: 'active,upcoming',
                maxResults: 1,
            });

            if (response.data.items.length > 0) {
                const broadcast = response.data.items[0];
                results.youtube = {
                    id: broadcast.id,
                    title: broadcast.snippet.title,
                    description: broadcast.snippet.description,
                };
            } else {
                 results.youtube = { error: 'No active or upcoming YouTube stream found.' };
            }
        } catch (error) {
            console.error('YouTube API Error:', error.message);
            results.youtube = { error: 'Failed to fetch from YouTube.' };
        }
    }

    res.json(results);
});

// Update stream info for selected platforms
app.post('/api/stream/update', async (req, res) => {
    const { twitchAuth, youtubeAuth, title, description, platforms } = req.body;
    const results = {};

    // Update Twitch
    if (platforms.twitch && twitchAuth?.token) {
        try {
            const twitchHeaders = {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${twitchAuth.token}`,
                'Content-Type': 'application/json',
            };
            const body = JSON.stringify({ title: title });

            const twitchResponse = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${twitchAuth.userId}`, {
                method: 'PATCH',
                headers: twitchHeaders,
                body: body,
            });

            if (twitchResponse.status === 204) { // 204 No Content is success
                results.twitch = { success: true };
            } else {
                const errorData = await twitchResponse.json();
                throw new Error(errorData.message || 'Failed to update Twitch.');
            }
        } catch (error) {
            console.error('Twitch Update Error:', error.message);
            results.twitch = { success: false, error: error.message };
        }
    }

    // Update YouTube
    if (platforms.youtube && youtubeAuth?.tokens) {
        try {
            const tokens = JSON.parse(youtubeAuth.tokens);
            youtubeOauth2Client.setCredentials(tokens);
            const youtube = google.youtube('v3');

            // First, find the active or upcoming broadcast to get its ID
            const listResponse = await youtube.liveBroadcasts.list({
                auth: youtubeOauth2Client,
                part: 'id,snippet',
                broadcastStatus: 'active,upcoming',
                maxResults: 1,
            });

            if (listResponse.data.items.length === 0) {
                throw new Error('No active or upcoming YouTube broadcast found to update.');
            }
            const broadcastToUpdate = listResponse.data.items[0];

            // Now, update it using the data we found
            const updateResponse = await youtube.liveBroadcasts.update({
                auth: youtubeOauth2Client,
                part: 'snippet',
                requestBody: {
                    id: broadcastToUpdate.id,
                    snippet: {
                        title: title,
                        description: description,
                        // The API requires the original scheduled time to be passed back
                        scheduledStartTime: broadcastToUpdate.snippet.scheduledStartTime,
                    },
                },
            });
            results.youtube = { success: true, title: updateResponse.data.snippet.title };
        } catch (error) {
            console.error('YouTube Update Error:', error.message);
            results.youtube = { success: false, error: error.message };
        }
    }

    res.json(results);
});

// This is for local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server listening on http://localhost:${PORT}`);
    });
}

module.exports = app; // Export the app for Vercel