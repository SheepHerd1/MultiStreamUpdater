import axios from 'axios';
import { withCors } from '../_utils/cors.js';
import { validateEnv } from '../_utils/env.js';

// Ensure required environment variables are set for authentication
validateEnv(['KICK_CLIENT_ID', 'KICK_CLIENT_SECRET', 'KICK_REDIRECT_URI']);
const { KICK_CLIENT_ID, KICK_CLIENT_SECRET, KICK_REDIRECT_URI } = process.env;

const KICK_TOKEN_URL = 'https://id.kick.com/oauth2/token';

// --- Route Handlers ---

/**
 * Handles the final step of the OAuth 2.0 PKCE flow.
 * Exchanges an authorization code for an access token.
 */
async function handleCallback(req, res) {
  const { code, code_verifier } = req.body;
  if (!code || !code_verifier) {
    return res.status(400).json({ error: 'Missing authorization code or code_verifier.' });
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', KICK_CLIENT_ID);
    params.append('client_secret', KICK_CLIENT_SECRET);
    params.append('redirect_uri', KICK_REDIRECT_URI);
    params.append('code_verifier', code_verifier);

    const response = await axios.post(KICK_TOKEN_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error exchanging Kick auth code for token:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to exchange authorization code for Kick token.' });
  }
}

/**
 * Handles refreshing an expired access token using a refresh token.
 */
async function handleRefresh(req, res) {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token not provided.' });
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refresh_token);
    params.append('client_id', KICK_CLIENT_ID);
    params.append('client_secret', KICK_CLIENT_SECRET);

    const response = await axios.post(KICK_TOKEN_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error refreshing Kick token:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to refresh Kick token.' });
  }
}

// --- Main Handler ---
async function handler(req, res) {
  const { action } = req.query;

  if (req.method === 'POST') {
    if (action === 'callback') return handleCallback(req, res);
    if (action === 'refresh') return handleRefresh(req, res);
  }

  return res.status(405).json({ error: 'Method Not Allowed or Invalid Action' });
}

export default withCors(handler);