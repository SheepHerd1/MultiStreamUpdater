import crypto from 'crypto';
import cookie from 'cookie';
import { withCors } from '../../_utils/cors.js';
import { validateEnv } from '../../_utils/env.js';

validateEnv(['KICK_CLIENT_ID', 'NEXT_PUBLIC_KICK_REDIRECT_URI']);

function handler(req, res) {
  const { KICK_CLIENT_ID, NEXT_PUBLIC_KICK_REDIRECT_URI } = process.env;

  // Generate a random state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');
  
  // Generate a code verifier and challenge for PKCE
  const codeVerifier = crypto.randomBytes(32).toString('hex');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Store state and verifier in secure, http-only cookies
  res.setHeader('Set-Cookie', [
    cookie.serialize('kick_oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV !== 'development', maxAge: 60 * 15, path: '/', sameSite: 'lax' }),
    cookie.serialize('kick_code_verifier', codeVerifier, { httpOnly: true, secure: process.env.NODE_ENV !== 'development', maxAge: 60 * 15, path: '/', sameSite: 'lax' }),
  ]);

  // Scopes required for the application
  // Adding 'channel:read' to view channel info like category and description.
  const scope = 'user:read channel:read channel:write offline_access';

  const params = new URLSearchParams({
    client_id: KICK_CLIENT_ID,
    redirect_uri: NEXT_PUBLIC_KICK_REDIRECT_URI,
    response_type: 'code',
    scope: scope,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  // Correct authorization URL from Kick's documentation
  const kickAuthUrl = `https://id.kick.com/oauth/authorize?${params.toString()}`;

  // Log the generated URL for debugging purposes in Vercel logs.
  console.log('Redirecting to Kick auth URL:', kickAuthUrl);

  res.redirect(302, kickAuthUrl);
}

export default withCors(handler);