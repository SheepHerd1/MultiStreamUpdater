import React, { useState, useEffect, useCallback } from 'react';
import jwtDecode from 'jwt-decode';
import api from './api';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

// A helper to get the initial auth state from localStorage
const getInitialAuth = () => {
  try {
    const storedAuth = localStorage.getItem('auth');
    if (storedAuth) {
      // Basic validation to ensure it's a plausible auth object
      const auth = JSON.parse(storedAuth);
      if (auth && (auth.twitch || auth.youtube || auth.kick)) {
        return auth;
      }
    }
  } catch (error) {
    console.error("Failed to parse auth from localStorage", error);
    localStorage.removeItem('auth'); // Clear corrupted item
  }
  return { twitch: null, youtube: null, kick: null };
};


function App() {
  const [auth, setAuth] = useState(getInitialAuth);
  const [isAuthLoading, setIsAuthLoading] = useState(false); // Can be false, initial check is synchronous

  const handleLogout = useCallback(() => {
    setAuth({ twitch: null, youtube: null, kick: null });
    localStorage.removeItem('auth');
  }, []);

  // This function will be our single source for updating auth state and localStorage
  const updateAuth = useCallback((newAuthData) => {
    setAuth(newAuthData);
    localStorage.setItem('auth', JSON.stringify(newAuthData));
  }, []);


  useEffect(() => {
    // This listener handles the successful authentication from the popup window
    const handleAuthMessage = (event) => {
      // It's good practice to check the origin in a production app
      // if (event.origin !== 'YOUR_VERCEL_URL') return;

      const currentAuth = getInitialAuth();
      let newAuthData = { ...currentAuth };

      if (event.data.type === 'twitch-auth-success' && event.data.token && event.data.id_token) {
        try {
          const decoded = jwtDecode(event.data.id_token);
          newAuthData.twitch = {
            token: event.data.token,
            userId: decoded.sub,
            userName: decoded.preferred_username || 'user',
            refreshToken: event.data.refreshToken,
          };
          updateAuth(newAuthData);
        } catch (e) {
          console.error("Failed to process Twitch token from popup:", e);
        }
      } else if (event.data.type === 'youtube-auth-success' && event.data.accessToken) {
        try {
          newAuthData.youtube = {
            token: event.data.accessToken,
            refreshToken: event.data.refreshToken,
          };
          updateAuth(newAuthData);
        } catch (e) {
          console.error("Failed to process YouTube token from popup:", e);
        }
      } else if (event.data.type === 'kick-auth-success' && event.data.accessToken) {
        try {
          // 1. Immediately store the tokens we have. This is crucial.
          // It ensures the refresh token is available for the interceptor if the next API call fails.
          const initialKickAuth = {
            token: event.data.accessToken,
            refreshToken: event.data.refreshToken,
            userId: null, // Will be filled in by the API call
            userName: 'user', // Placeholder
          };
          const tempAuthData = { ...newAuthData, kick: initialKickAuth };
          updateAuth(tempAuthData);

          // 2. Now, fetch the user info. If this fails with a 401, the interceptor
          // can now find the refresh token we just saved.
          api.get('/api/kick?action=user_info', {
            headers: { 'Authorization': `Bearer ${event.data.accessToken}` }
          })
            .then(userInfoResponse => {
              // 3. On success, update the auth state with the full user details.
              const finalKickAuth = {
                ...initialKickAuth, // carries over the tokens
                userId: userInfoResponse.data.id,
                userName: userInfoResponse.data.username,
              };
              const finalAuthData = { ...tempAuthData, kick: finalKickAuth };
              updateAuth(finalAuthData);
            })
            .catch(err => {
              // The interceptor will handle 401s by refreshing the token.
              // We only want to log the user out if the error is something else,
              // or if the token refresh itself fails (which the interceptor will re-throw).
              if (err.response?.status !== 401) {
                console.error("Failed to fetch Kick user info after auth:", err);
                handleLogout(); // A general logout is cleaner here.
              }
            });
        } catch (e) {
          console.error("Failed to process Kick token from popup:", e);
        }
      }
    };

    // This listener handles auth updates from the API interceptor (token refresh)
    const handleAuthUpdateFromInterceptor = (event) => {
      if (event.detail) {
        setAuth(event.detail);
      }
    };

    // This listener handles auth updates from other tabs
    const handleStorageChange = (event) => {
      if (event.key === 'auth') {
        setAuth(getInitialAuth());
      }
    };

    // This listener handles fatal auth errors from the interceptor
    const handleAuthError = (event) => {
      const { platform } = event.detail;
      if (!platform) return;

      console.warn(`Fatal auth error for ${platform}, clearing its session.`);
      const currentAuth = getInitialAuth();
      currentAuth[platform] = null;

      // Check if any other platform is still authenticated
      const anyAuthRemaining = Object.values(currentAuth).some(p => p !== null);

      if (anyAuthRemaining) {
        updateAuth(currentAuth);
      } else {
        handleLogout(); // Logout completely if no platforms are left
      }
    };

    window.addEventListener('message', handleAuthMessage);
    window.addEventListener('authUpdated', handleAuthUpdateFromInterceptor);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authError', handleAuthError);

    return () => {
      window.removeEventListener('message', handleAuthMessage);
      window.removeEventListener('authUpdated', handleAuthUpdateFromInterceptor);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authError', handleAuthError);
    };
  }, [updateAuth, handleLogout]);

  if (isAuthLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      {auth.twitch || auth.youtube || auth.kick ? <Dashboard auth={auth} onLogout={handleLogout} setAuth={setAuth} /> : <Login />}
    </div>
  );
}

export default App;
