import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'https://multi-stream-updater.vercel.app',
});

// We use this to prevent multiple parallel refresh requests for the same platform
const refreshingPromises = {
  twitch: null,
  youtube: null,
  kick: null,
  trovo: null,
};

// Utility to extract platform from URL, required for the interceptor
const getPlatformFromUrl = (url) => {
  if (url.startsWith('/api/twitch')) {
    return 'twitch';
  }
  if (url.startsWith('/api/youtube')) {
    return 'youtube';
  }
  if (url.startsWith('/api/kick')) {
    return 'kick';
  }
  if (url.startsWith('/api/trovo')) {
    return 'trovo';
  }
  return null;
};

api.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config;
    const platform = getPlatformFromUrl(originalRequest.url);

    // Check if it's a 401, we have a platform, and we haven't retried yet.
    if (error.response?.status === 401 && platform && !originalRequest._retry) {
      originalRequest._retry = true;

      // If a refresh for this platform is already in progress, wait for it to complete
      if (refreshingPromises[platform]) {
        try {
          const newAuth = await refreshingPromises[platform];
          originalRequest.headers['Authorization'] = `Bearer ${newAuth.token}`;
          return api(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      // Start a new token refresh
      refreshingPromises[platform] = new Promise(async (resolve, reject) => {
        window.dispatchEvent(new CustomEvent('tokenRefreshStart', { detail: { platform } }));

        try {
          const authData = JSON.parse(localStorage.getItem('auth')) || {};
          const platformAuth = authData[platform];

          if (!platformAuth?.refreshToken) {
            throw new Error(`No refresh token for ${platform}`);
          }

          const { data } = await axios.post(
            `${api.defaults.baseURL}/api/auth/${platform}/refresh`,
            {
              refresh_token: platformAuth.refreshToken,
              scope: platformAuth.scope, // Pass the scope to the backend
            }
          );

          // Update the platform's auth details with the new tokens
          const newPlatformAuth = {
            ...platformAuth,
            token: data.access_token,
            refreshToken: data.refresh_token || platformAuth.refreshToken, // Use new refresh token if provided
            csrfToken: data.csrfToken || platformAuth.csrfToken, // Use new CSRF token if provided
          };

          const newAuthData = { ...authData, [platform]: newPlatformAuth };
          localStorage.setItem('auth', JSON.stringify(newAuthData));

          // Dispatch a custom event to tell App.js to update its state
          window.dispatchEvent(new CustomEvent('authUpdated', { detail: newAuthData }));

          // Resolve the promise with the new token for the original request to retry
          resolve({ token: newPlatformAuth.token });
        } catch (refreshError) {
          console.error(`Token refresh failed for ${platform}:`, refreshError);
          // This is a critical failure. The refresh token is likely invalid.
          // Dispatch a global event so the UI can handle the logout for this platform.
          window.dispatchEvent(new CustomEvent('authError', { detail: { platform } }));
          reject(refreshError);
        } finally {
          window.dispatchEvent(new CustomEvent('tokenRefreshEnd', { detail: { platform } }));
          refreshingPromises[platform] = null; // Clear the promise
        }
      });

      try {
        const newAuth = await refreshingPromises[platform];
        originalRequest.headers['Authorization'] = `Bearer ${newAuth.token}`; // newAuth is { token: '...' }
        return api(originalRequest);
      } catch (refreshError) {
        // The refresh promise was rejected, propagate the error
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
