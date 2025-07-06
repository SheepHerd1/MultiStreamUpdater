/**
 * A higher-order function that wraps a Vercel serverless function handler
 * with CORS (Cross-Origin Resource Sharing) logic.
 * @param {Function} handler The original serverless function handler.
 * @returns {Function} The new handler with CORS logic.
 */
export const withCors = (handler) => {
  return async (req, res) => {
    // Set CORS headers for all responses.
    // The origin should be restricted to your frontend's URL in production.
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle the preflight (OPTIONS) request which is sent by browsers
    // to check if the actual request is safe to send.
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    // If it's not a preflight request, pass control to the original handler.
    return handler(req, res);
  };
};
