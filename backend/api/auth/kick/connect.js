import { withCors } from '../../_utils/cors.js';
import { validateEnv } from '../../_utils/env.js';

validateEnv(['KICK_CLIENT_ID', 'NEXT_PUBLIC_KICK_REDIRECT_URI']);

function handler(req, res) {
  const { KICK_CLIENT_ID, NEXT_PUBLIC_KICK_REDIRECT_URI } = process.env;

  // Correct scopes based on Kick's official API documentation.
  // 'channel:update' is for updating the stream title and category.
  const scope = 'channel:update';

  const params = new URLSearchParams({
    client_id: KICK_CLIENT_ID,
    redirect_uri: NEXT_PUBLIC_KICK_REDIRECT_URI,
    response_type: 'code',
    scope: scope,
  });

  // Correct authorization URL for user-facing consent screen.
  const kickAuthUrl = `https://kick.com/oauth2/authorize?${params.toString()}`;

  res.redirect(302, kickAuthUrl);
}

export default withCors(handler);