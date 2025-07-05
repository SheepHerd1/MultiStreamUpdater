import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// This interceptor will run before every request
api.interceptors.request.use((config) => {
  // This is a placeholder for future logic if needed
  return config;
}, (error) => {
  return Promise.reject(error);
});

// This interceptor will run for every response
api.interceptors.response.use(
  (response) => response, // If the response is successful, just return it
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is a 401 (Unauthorized) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if it's a YouTube API call that failed
      if (originalRequest.url.includes('/api/youtube/')) {
        originalRequest._retry = true; // Mark that we are retrying this request
        const refreshToken = localStorage.getItem('yt_refresh_token');

        if (refreshToken) {
          try {
            // Call our new backend endpoint to get a fresh access token
            const { data } = await axios.post(`${API_BASE_URL}/api/auth/youtube/refresh`, { refreshToken });
            const newAccessToken = data.accessToken;

            // Update the token in localStorage and in the original request's header
            localStorage.setItem('yt_access_token', newAccessToken);
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

            // Retry the original request with the new token
            return api(originalRequest);
          } catch (refreshError) {
            // If the refresh fails, we can't recover, so reject the promise
            return Promise.reject(refreshError);
          }
        }
      }
    }
    // For any other errors, just reject the promise
    return Promise.reject(error);
  }
);

export default api;