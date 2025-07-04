# Backend for Multi-Stream Updater

This directory contains the serverless functions for handling OAuth and API calls.

## Deployment to Vercel

1.  Push your forked repository to your GitHub account.
2.  Go to Vercel and create a new project.
3.  Import your forked GitHub repository.
4.  Vercel will automatically detect it as a Node.js project. Set the **Root Directory** to `backend`.
5.  Configure the Environment Variables in the Vercel project settings. This is the most critical step.
6.  Deploy! Your backend API will be live.

## Environment Variables

You must get API credentials from each platform's developer console and add them to your Vercel project's environment variables.

```
# Vercel URL (the URL of this deployment)
VITE_APP_VERCEL_URL="https://your-project-name.vercel.app"

# The URL of your frontend GitHub pages site
FRONTEND_URL="https://your-github-username.github.io/multi-stream-updater"

# Twitch Credentials
TWITCH_CLIENT_ID="your_twitch_client_id"
TWITCH_CLIENT_SECRET="your_twitch_client_secret"

# Add other platform credentials here...
# YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, etc.
```y