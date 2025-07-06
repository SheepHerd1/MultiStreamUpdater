/**
 * A higher-order function that wraps a Vercel serverless function handler
 * with CORS (Cross-Origin Resource Sharing) logic.
 */

// A whitelist of origins that are allowed to make requests to this API.
const allowedOrigins = [
  'http://localhost:3000', // For local development
  'https://sheepherd1.github.io' // For production on GitHub Pages
];

export const withCors = (handler) => {
  return async (req, res) => {
    const origin = req.headers.origin;

    // If the request's origin is in our whitelist, set the header to that origin.
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle the preflight (OPTIONS) request.
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    return handler(req, res);
  };
};
