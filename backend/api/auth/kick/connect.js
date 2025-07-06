import { withCors } from '../../_utils/cors';
import { validateEnv } from '../../_utils/env';

validateEnv(['KICK_CLIENT_ID', 'NEXT_PUBLIC_KICK_REDIRECT_URI']);

function handler(req, res) {
  const { KICK_CLIENT_ID, NEXT_PUBLIC_KICK_REDIRECT_URI } = process.env;

  // NOTE: The scope should be adjusted based on the official Kick API documentation.
  // These are examples of permissions you might need.
  const scope = 'channel:read channel:update'; 

  const params = new URLSearchParams({
    client_id: KICK_CLIENT_ID,
    redirect_uri: NEXT_PUBLIC_KICK_REDIRECT_URI,
    response_type: 'code',
    scope: scope,
  });

  // NOTE: The authorization URL should be confirmed from the official Kick API documentation.
  const kickAuthUrl = `https://kick.com/api/v2/oauth/authorize?${params.toString()}`;

  res.redirect(302, kickAuthUrl);
}

export default withCors(handler);

