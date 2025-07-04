import React, { useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [auth, setAuth] = useState({ twitch: null });

  useEffect(() => {
    // Handle the GitHub Pages 404 redirect
    const urlParams404 = new URLSearchParams(window.location.search);
    const p = urlParams404.get('p');
    const q = urlParams404.get('q');
    if (p) {
      const path = p.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
      const search = q ? q.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>') : '';
      const newUrl = `${window.location.pathname.replace(/[^/]*$/, '')}${path}${search}`;
      window.history.replaceState(null, '', newUrl);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const twitchToken = urlParams.get('twitch_access_token');

    if (twitchToken) {
      try {
        const decoded = jwtDecode(twitchToken);
        const twitchAuth = {
          token: twitchToken,
          userId: decoded.user_id,
          userName: decoded.preferred_username || 'user',
        };
        setAuth(prev => ({ ...prev, twitch: twitchAuth }));
        // Store in localStorage to persist login
        localStorage.setItem('twitchAuth', JSON.stringify(twitchAuth));
        // Clean the URL, respecting the GitHub Pages sub-path
        window.history.replaceState({}, document.title, window.location.pathname);
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
  }, []);

  return <div className="App">{auth.twitch ? <Dashboard auth={auth} /> : <Login />}</div>;
}

export default App;