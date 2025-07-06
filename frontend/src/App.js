import React, { useState, useEffect, useCallback } from 'react';
import jwtDecode from 'jwt-decode';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

// A helper to get the initial auth state from localStorage
const getInitialAuth = () => {
  try {
    const storedAuth = localStorage.getItem('auth');
    if (storedAuth) {
      // Basic validation to ensure it's a plausible auth object
      const auth = JSON.parse(storedAuth);
      if (auth && (auth.twitch || auth.youtube)) {
        return auth;
      }
    }
  } catch (error) {
    console.error("Failed to parse auth from localStorage", error);
    localStorage.removeItem('auth'); // Clear corrupted item
  }
  return { twitch: null, youtube: null };
};


function App() {
  const [auth, setAuth] = useState(getInitialAuth);
  const [isAuthLoading, setIsAuthLoading] = useState(false); // Can be false, initial check is synchronous

  const handleLogout = useCallback(() => {
    setAuth({ twitch: null, youtube: null });
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

    window.addEventListener('message', handleAuthMessage);
    window.addEventListener('authUpdated', handleAuthUpdateFromInterceptor);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('message', handleAuthMessage);
      window.removeEventListener('authUpdated', handleAuthUpdateFromInterceptor);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [updateAuth]);

  if (isAuthLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      {auth.twitch || auth.youtube ? <Dashboard auth={auth} onLogout={handleLogout} setAuth={setAuth} /> : <Login />}
    </div>
  );
}

export default App;
