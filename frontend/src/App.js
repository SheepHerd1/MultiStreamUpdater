import React, { useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import api from './api'; // Import api to get the base URL

function App() {
  const [auth, setAuth] = useState({ twitch: null, youtube: null });
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const handleLogout = () => {
    // Clear the auth state in React
    setAuth({ twitch: null, youtube: null });
    // Remove the persisted session from the browser's storage
    localStorage.removeItem('twitchAuth');
    localStorage.removeItem('yt_access_token');
    localStorage.removeItem('yt_refresh_token');
  };

  useEffect(() => {
    const handleAuthMessage = (event) => {
      // It's good practice to check the origin, but for now we'll focus on the message type.
      // You can add an origin check later if needed: if (event.origin !== 'YOUR_VERCEL_URL') return;

      if (event.data.type === 'twitch-auth-success' && event.data.token && event.data.id_token) {
        try {
          const decoded = jwtDecode(event.data.id_token);
          const twitchAuth = {
            token: event.data.token,
            userId: decoded.sub,
            userName: decoded.preferred_username || 'user',
          };
          // Save the full session to localStorage
          localStorage.setItem('twitchAuth', JSON.stringify(twitchAuth));
          // Update the state to show the dashboard
          setAuth(prevAuth => ({ ...prevAuth, twitch: twitchAuth }));
        } catch (e) {
          console.error("Failed to process Twitch token from popup:", e);
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);

    return () => {
      window.removeEventListener('message', handleAuthMessage);
    };
  }, []); // Empty dependency array ensures this runs only once.
  
  // Effect to initialize auth state from all sources on mount
  useEffect(() => {
    const authState = { twitch: null, youtube: null };

    // 1. Check for Twitch auth in localStorage
    const storedTwitchAuth = localStorage.getItem('twitchAuth');
    if (storedTwitchAuth) {
      try {
        authState.twitch = JSON.parse(storedTwitchAuth);
      } catch (e) {
        console.error("Failed to parse stored Twitch auth:", e);
        localStorage.removeItem('twitchAuth');
      }
    }

    // 2. Check for YouTube auth in URL hash (from OAuth callback)
    const hash = window.location.hash.substring(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      const accessToken = params.get('yt_access_token');
      const refreshToken = params.get('yt_refresh_token');

      if (accessToken) {
        localStorage.setItem('yt_access_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('yt_refresh_token', refreshToken);
        }
        authState.youtube = { token: accessToken, refreshToken: refreshToken };
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    } else {
      // 3. If not in hash, check for YouTube auth in localStorage
      const accessToken = localStorage.getItem('yt_access_token');
      if (accessToken) {
        authState.youtube = { token: accessToken, refreshToken: localStorage.getItem('yt_refresh_token') };
      }
    }

    setAuth(authState);
    setIsAuthLoading(false);
  }, []);

  // Effect to sync auth state across tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'yt_access_token') {
        setAuth(prev => ({ ...prev, youtube: { ...prev.youtube, token: event.newValue }}));
      }
      if (event.key === 'twitchAuth') {
        setAuth(prev => ({ ...prev, twitch: event.newValue ? JSON.parse(event.newValue) : null }));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (isAuthLoading) {
    return <div>Loading...</div>; // Or a proper spinner component
  }

  return (
    <div className="App">
      {auth.twitch || auth.youtube ? <Dashboard auth={auth} onLogout={handleLogout} setAuth={setAuth} /> : <Login />}
    </div>
  );
}

export default App;