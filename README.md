# Multi-Platform Stream Updater

A free tool for streamers to update their stream title, category, and tags across multiple platforms simultaneously.

## Features

- **Supported Platforms:** Twitch, YouTube, Kick, Trovo, TikTok (where APIs are available).
- **One-Click Update:** Change your stream information everywhere at once.
- **Secure:** Uses OAuth 2.0 to connect to your accounts. Your credentials are never stored.
- **Free & Open Source:** Built for the community.

## Project Structure

- **/frontend**: A React application that provides the user interface. Deployed to GitHub Pages.
- **/backend**: A Node.js serverless application that handles authentication and API interactions. Deployed to Vercel.

## Setup & Deployment

1.  **Fork this repository.**
2.  Follow the instructions in `backend/README.md` to set up and deploy the backend on Vercel.
3.  Follow the instructions in `frontend/README.md` to configure and deploy the frontend on GitHub Pages.

This separation is essential to keep your API keys and secrets secure on the backend, away from the public-facing frontend code.

