import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// --- Route Imports ---
import twitchAuthRoutes from '../src/routes/auth/twitch.js';
import youtubeAuthRoutes from '../src/routes/auth/youtube.js';
import kickAuthRoutes from '../src/routes/auth/kick.js';
// import trovoAuthRoutes from '../src/routes/auth/trovo.js'; // Temporarily disabled

import twitchApiRoutes from '../src/routes/twitch.js';
import youtubeApiRoutes from '../src/routes/youtube.js';
import kickApiRoutes from '../src/routes/kick.js';

const app = express();

// --- Middleware Setup ---
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());

// --- Authentication Routes ---
app.use('/api/auth/twitch', twitchAuthRoutes);
app.use('/api/auth/youtube', youtubeAuthRoutes);
app.use('/api/auth/kick', kickAuthRoutes);
// app.use('/api/auth/trovo', trovoAuthRoutes); // Temporarily disabled

// --- API Proxy Routes ---
app.use('/api/twitch', twitchApiRoutes);
app.use('/api/youtube', youtubeApiRoutes);
app.use('/api/kick', kickApiRoutes);

// A simple root endpoint to confirm the server is running
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to the Multi-Stream Updater API!' });
});

export default app;