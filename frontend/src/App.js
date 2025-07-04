import React, { useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [auth, setAuth] = useState({ twitch: null });

  const handleLogout = () => {
    // Clear the auth state in React
    setAuth({ twitch: null });
    // Remove the persisted session from the browser's storage
    localStorage.removeItem('twitchAuth');
  };

  useEffect(() => {
    // This effect handles the initial setup of the application.
    // It's responsible for three main tasks in order:
    // 1. Correcting the URL if redirected from a 404 page on GitHub Pages.
    // 2. Processing an authentication token from the URL if one exists.
    // 3. Loading a persisted session from localStorage if no token is present.

    // First, check for a token from the URL, accounting for the GitHub Pages redirect.
    let effectiveSearch = window.location.search;
    if (sessionStorage.redirect) {
      // If we were redirected from 404.html, the real URL is in sessionStorage.
      const redirectUrl = new URL(sessionStorage.redirect);
      effectiveSearch = redirectUrl.search;
      delete sessionStorage.redirect;
    }

    const urlParams = new URLSearchParams(effectiveSearch);
    const twitchToken = urlParams.get('twitch_access_token');

    if (twitchToken) {
      // A token was found in the URL. Process it.
      try {
        const decoded = jwtDecode(twitchToken);
        const twitchAuth = {
          token: twitchToken,
          userId: decoded.user_id,
          userName: decoded.preferred_username || 'user',
        };
        // Set the auth state, save to localStorage, and clean the URL all at once.
        setAuth(prev => ({ ...prev, twitch: twitchAuth }));
        localStorage.setItem('twitchAuth', JSON.stringify(twitchAuth));
        window.history.replaceState({}, document.title, window.location.pathname.replace(/\/$/, ''));
      } catch (e) {
        console.error("Invalid token:", e);
      }
    } else {
      // No token in URL, so check for a persisted session in localStorage.
      const storedTwitchAuth = localStorage.getItem('twitchAuth');
      if (storedTwitchAuth) {
        try {
          setAuth(prev => ({ ...prev, twitch: JSON.parse(storedTwitchAuth) }));
        } catch (e) {
          console.error("Failed to parse auth from localStorage", e);
          localStorage.removeItem('twitchAuth');
        }
      }
    }
  }, []); // Empty dependency array means this runs only once on mount

  return (
    <div className="App">
      {auth.twitch ? <Dashboard auth={auth} onLogout={handleLogout} /> : <Login />}
    </div>
  );
}

export default App;