import React, { useState, useEffect, useCallback } from 'react';
import jwtDecode from 'jwt-decode';
import api from './api';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

// A helper to get the initial auth state from localStorage
const getInitialAuth = () => {
  try {
    const storedAuth = localStorage.getItem('auth');
    if (storedAuth) {
      // Basic validation to ensure it's a plausible auth object
      const auth = JSON.parse(storedAuth);
      if (auth && (auth.twitch || auth.youtube || auth.kick || auth.trovo)) {
        return auth;
      }
    }
  } catch (error) {
    console.error("Failed to parse auth from localStorage", error);
    localStorage.removeItem('auth'); // Clear corrupted item
  }
  return { twitch: null, youtube: null, kick: null, trovo: null };
};


function App() {
  const [auth, setAuth] = useState(getInitialAuth);
  const [isAuthLoading, setIsAuthLoading] = useState(false); // Can be false, initial check is synchronous

  const handleLogout = useCallback(() => {
    setAuth({ twitch: null, youtube: null, kick: null, trovo: null });
    localStorage.removeItem('auth');
  }, []);

  // This function will be our single source for updating auth state and localStorage
  const updateAuth = useCallback((newAuthData) => {
    setAuth(newAuthData);
    localStorage.setItem('auth', JSON.stringify(newAuthData));
  }, []);

  const handleIndividualLogout = useCallback((platform) => {
    const currentAuth = getInitialAuth();
    currentAuth[platform] = null;
    updateAuth(currentAuth);
    // If no platforms are left after this logout, perform a full logout
    if (!Object.values(currentAuth).some(p => p !== null)) {
      handleLogout();
    }
  }, [handleLogout, updateAuth]);

  // --- Authentication Handlers ---
  // This pattern replaces the long if/else if chain for better scalability.
  const authSuccessHandlers = {
    'twitch-auth-success': (data) => {
      if (!data.token || !data.id_token) throw new Error('Missing Twitch tokens.');
      const decoded = jwtDecode(data.id_token);
      return {
        twitch: {
          token: data.token,
          userId: decoded.sub,
          userName: decoded.preferred_username || 'user',
          refreshToken: data.refreshToken,
        },
      };
    },
    'youtube-auth-success': async (data) => {
      if (!data.accessToken) throw new Error('Missing YouTube access token.');
      try {
        const channelInfoResponse = await api.get('/api/youtube?action=channel_info', {
          headers: { 'Authorization': `Bearer ${data.accessToken}` }
        });
        const userName = channelInfoResponse.data?.snippet?.title;
        const userId = channelInfoResponse.data?.id;
        return {
          youtube: {
            token: data.accessToken,
            refreshToken: data.refreshToken,
            userName: userName || 'YouTube User',
            userId: userId,
          },
        };
      } catch (e) {
        console.error("Failed to fetch YouTube user info, saving tokens only.", e);

        // Fallback to saving just the tokens if user info fetch fails
        return {
          youtube: {
            token: data.accessToken,
            refreshToken: data.refreshToken,
            userName: 'YouTube (Error)', // Provide a fallback name
          },
        };
      }
    },
    'kick-auth-success': (data) => {
      if (!data.accessToken || !data.userId) throw new Error('Missing essential Kick auth data (token or userId).');
      // The CSRF token is critical for updates. Warn the user if it's missing.
      if (!data.csrfToken) {
        console.warn('Kick CSRF Token not received from backend. Stream updates may fail.');
      }
      return {
        kick: {
          token: data.accessToken,
          refreshToken: data.refreshToken,
          userId: data.userId,
          userName: data.userName,
          scope: data.scope,
          csrfToken: data.csrfToken, // Store the CSRF token
        },
      };
    },
    'trovo-auth-success': (data) => {
      if (!data.accessToken || !data.userId) throw new Error('Missing Trovo auth data.');
      return {
        trovo: { ...data }, // Trovo data is already in the correct shape
      };
    },
  };


  useEffect(() => {
    // This listener handles the successful authentication from the popup window
    const handleAuthMessage = async (event) => {
      // It's good practice to check the origin in a production app
      // Let's add some debugging to see what we receive.
      console.log('Received message from popup:', {
        origin: event.origin,
        data: event.data,
      });

      // if (event.origin !== 'YOUR_VERCEL_URL') return;

      const { type, ...data } = event.data;
      const handler = authSuccessHandlers[type];

      if (handler) {
        try {
          const currentAuth = getInitialAuth();
          const platformUpdate = await handler(data);
          const newAuthData = { ...currentAuth, ...platformUpdate };
          updateAuth(newAuthData);
        } catch (e) {
          console.error(`Failed to process auth for ${type}:`, e);
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
      {auth.twitch || auth.youtube || auth.kick || auth.trovo ? (
        <Dashboard auth={auth} onLogout={handleLogout} onIndividualLogout={handleIndividualLogout} setAuth={setAuth} />
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;
