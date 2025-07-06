/**
 * Validates that all required environment variables are present.
 * If any are missing, it throws an error, causing the serverless function to fail fast.
 * @param {string[]} requiredVars An array of environment variable names to check.
 */
export const validateEnv = (requiredVars) => {
  const missingVars = requiredVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    throw new Error(`Server configuration error: Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

