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

    let tokenToProcess = null;
    let searchParams = new URLSearchParams(window.location.search);

    // Handle the GitHub Pages 404 redirect using sessionStorage.
    if (sessionStorage.redirect) {
      const redirectUrl = new URL(sessionStorage.redirect);
      // Prioritize the search params from the URL that was saved before the redirect.
      searchParams = redirectUrl.searchParams;
      // We no longer need the sessionStorage item, so clear it.
      delete sessionStorage.redirect;
    }

    tokenToProcess = searchParams.get('twitch_access_token');

    if (tokenToProcess) {
      try {
        const decoded = jwtDecode(tokenToProcess);
        const twitchAuth = {
          token: tokenToProcess,
          userId: decoded.user_id,
          userName: decoded.preferred_username || 'user',
        };
        setAuth(prev => ({ ...prev, twitch: twitchAuth }));
        // Store in localStorage to persist login
        localStorage.setItem('twitchAuth', JSON.stringify(twitchAuth));
      } catch (e) {
        console.error("Invalid token:", e);
      }
    } else {
      // Check localStorage on initial load
      const storedTwitchAuth = localStorage.getItem('twitchAuth');
      if (storedTwitchAuth) {
        try {
          setAuth(prev => ({ ...prev, twitch: JSON.parse(storedTwitchAuth) }));
        } catch (e) {
          console.error("Failed to parse auth from localStorage", e);
          localStorage.removeItem('twitchAuth'); // Clear corrupted item
        }
      }
    }
  }, []); // Empty dependency array means this runs only once on mount

  // This effect is responsible for cleaning the URL *after* authentication is successful.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    // If we are authenticated AND there are still auth tokens in the URL, clean it.
    if (auth.twitch && (urlParams.has('twitch_access_token') || urlParams.has('p'))) {
      window.history.replaceState({}, document.title, window.location.pathname.replace(/\/$/, ''));
    }
  }, [auth.twitch]); // This effect runs whenever the auth.twitch state changes

  return (
    <div className="App">
      {auth.twitch ? <Dashboard auth={auth} onLogout={handleLogout} /> : <Login />}
    </div>
  );
}

export default App;