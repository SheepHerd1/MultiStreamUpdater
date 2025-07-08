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

// --- CORS Configuration ---
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = [frontendUrl];

// For GitHub Pages, the origin is the base domain (e.g., https://user.github.io),
// but the full URL includes the repo path. We need to allow both.
try {
    const urlObject = new URL(frontendUrl);
    if (urlObject.hostname.endsWith('github.io') && urlObject.origin !== frontendUrl) {
        allowedOrigins.push(urlObject.origin);
    }
} catch (e) {
    console.warn('Could not parse FRONTEND_URL for CORS origin calculation:', e.message);
}

// --- Middleware Setup ---
app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
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