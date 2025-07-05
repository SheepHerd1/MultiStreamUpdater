import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'https://multi-stream-updater.vercel.app',
});

// --- Axios Interceptor for Automatic Token Refresh ---

// This flag prevents a storm of refresh requests if multiple API calls fail at once.
let isRefreshing = false;
// This is a queue for API calls that failed while a token refresh was in progress.
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  // If a request is successful, just pass the response along.
  response => response,
  // If a request fails, this logic will run.
  async (error) => {
    const originalRequest = error.config;

    // We only want to handle 401 Unauthorized errors, and we don't want to retry a request forever.
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      if (isRefreshing) {
        // If a refresh is already happening, we add the failed request to a queue.
        // It will be retried once the new token is available.
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const isYoutubeRequest = originalRequest.url.includes('/api/youtube/');
      const isTwitchRequest = originalRequest.url.includes('/api/stream/') || originalRequest.url.includes('/api/twitch/');
      if (isYoutubeRequest) {
        const refreshToken = localStorage.getItem('yt_refresh_token');
        if (refreshToken) {
          try {
            // Make a direct axios call to the refresh endpoint to avoid an infinite loop.
            const { data } = await axios.post(`${api.defaults.baseURL}/api/auth/youtube/refresh`, { refreshToken });
            const newAccessToken = data.access_token; // Ensure your backend returns 'access_token'

            // The 'storage' event listener in Dashboard.js will see this change and update the component's state.
            localStorage.setItem('yt_access_token', newAccessToken);

            // Update the authorization header for the request that just failed.
            originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
            
            // Retry all the requests that were queued up while we were refreshing.
            processQueue(null, newAccessToken);
            
            // Finally, retry the original request that failed.
            return api(originalRequest);

          } catch (refreshError) {
            console.error('YouTube session expired or refresh failed. Please log in again.', refreshError);
            // Clear out the bad tokens
            localStorage.removeItem('yt_access_token');
            localStorage.removeItem('yt_refresh_token');
            // Reject all queued requests
            processQueue(refreshError, null);
            // TODO: You could trigger a global logout state here to redirect the user to the login page.
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }
      } else if (isTwitchRequest) {
        const twitchAuthString = localStorage.getItem('twitchAuth');
        if (twitchAuthString) {
          try {
            const twitchAuth = JSON.parse(twitchAuthString);
            const refreshToken = twitchAuth.refreshToken;

            if (!refreshToken) {
              // This can happen if the user authenticated before the refresh token flow was implemented.
              // We must treat this as a session expiration and force a re-login.
              throw new Error('No Twitch refresh token available in local storage.');
            }

            const { data } = await axios.post(`${api.defaults.baseURL}/api/auth/twitch/refresh`, { refreshToken });
            
            // Update the entire auth object with new tokens
            const newTwitchAuth = {
              ...twitchAuth,
              token: data.accessToken,
              refreshToken: data.refreshToken,
            };
            localStorage.setItem('twitchAuth', JSON.stringify(newTwitchAuth));

            originalRequest.headers['Authorization'] = 'Bearer ' + data.accessToken;
            processQueue(null, data.accessToken);
            return api(originalRequest);

          } catch (refreshError) {
            console.error('Twitch session expired. Please log in again.', refreshError);
            localStorage.removeItem('twitchAuth');
            processQueue(refreshError, null);
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }
      }
      
      // If it's not a request we can handle or there's no refresh token, stop.
      isRefreshing = false;
    }

    // For any other errors, just pass them along.
    return Promise.reject(error);
  }
);

export default api;
