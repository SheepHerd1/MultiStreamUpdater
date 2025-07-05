/**
 * A higher-order function to add CORS headers to a Vercel Serverless Function.
 * This centralizes CORS logic for all API endpoints.
 * @param {Function} fn The serverless function to wrap.
 * @returns {Function} The wrapped function with CORS headers.
 */
export const allowCors = (fn) => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://sheepherd1.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle the browser's preflight check
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  return await fn(req, res);
};