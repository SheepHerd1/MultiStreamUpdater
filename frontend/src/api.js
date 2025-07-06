import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'https://multi-stream-updater.vercel.app',
});

// We use this to prevent multiple parallel refresh requests for the same platform
const refreshingPromises = {
  twitch: null,
  youtube: null,
  kick: null,
};

// Utility to extract platform from URL, required for the interceptor
const getPlatformFromUrl = (url) => {
  if (url.includes('/api/twitch/') || url.includes('/api/stream/')) {
    // We assume /api/stream/ is for Twitch based on the Dashboard logic
    return 'twitch';
  }
  if (url.includes('/api/youtube/')) {
    return 'youtube';
  }
  if (url.includes('/api/kick/')) {
    return 'kick';
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
          const { data } = await axios.post(`${api.defaults.baseURL}/api/auth/${platform}/refresh`);
          
          const newAuth = { token: data.accessToken };

          // Update auth data in localStorage so other tabs get it too
          const authData = JSON.parse(localStorage.getItem('auth')) || {};
          authData[platform] = { ...authData[platform], ...newAuth };
          localStorage.setItem('auth', JSON.stringify(authData));

          // Dispatch a custom event to tell App.js to update its state
          window.dispatchEvent(new CustomEvent('authUpdated', { detail: authData }));

          resolve(newAuth);
        } catch (refreshError) {
          console.error(`Token refresh failed for ${platform}:`, refreshError);
          // If refresh fails, we should probably log the user out.
          reject(refreshError);
        } finally {
          window.dispatchEvent(new CustomEvent('tokenRefreshEnd', { detail: { platform } }));
          refreshingPromises[platform] = null; // Clear the promise
        }
      });

      try {
        const newAuth = await refreshingPromises[platform];
        originalRequest.headers['Authorization'] = `Bearer ${newAuth.token}`;
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
