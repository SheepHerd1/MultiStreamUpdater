require('dotenv').config(); // Ensures environment variables are loaded for local development
const express = require('express');
const cors = require('cors');

const app = express();

// --- Middleware Setup ---
app.use(cors({
    // Restrict the origin to your frontend's URL for better security
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json()); // Use the built-in JSON body parser for Express

// --- Authentication Routes ---
// These routes handle the OAuth flows for each platform. We assume the other
// files (twitch.js, youtube.js, kick.js) exist in the 'auth' directory.
const twitchAuthRoutes = require('./auth/twitch');
const youtubeAuthRoutes = require('./auth/youtube');
const kickAuthRoutes = require('./auth/kick');
// const trovoAuthRoutes = require('./auth/trovo'); // Temporarily disabled

app.use('/api/auth/twitch', twitchAuthRoutes);
app.use('/api/auth/youtube', youtubeAuthRoutes);
app.use('/api/auth/kick', kickAuthRoutes);
// app.use('/api/auth/trovo', trovoAuthRoutes); // Temporarily disabled

// --- API Proxy Routes ---
// These routes forward requests from our frontend to the actual platform APIs,
// injecting the required authentication tokens. This keeps secrets off the client.
const twitchApiRoutes = require('./twitch');
const youtubeApiRoutes = require('./youtube');
const kickApiRoutes = require('./kick');
// Note: A 'trovo.js' for API proxying will be needed for dashboard functionality.

app.use('/api/twitch', twitchApiRoutes);
app.use('/api/youtube', youtubeApiRoutes);
app.use('/api/kick', kickApiRoutes);

// A simple root endpoint to confirm the server is running
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to the Multi-Stream Updater API!' });
});

// Export the app for Vercel's serverless environment
module.exports = app;