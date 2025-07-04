import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [auth, setAuth] = useState({ twitch: null });

  useEffect(() => {
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
        // Clean the URL
        window.history.replaceState({}, document.title, "/");
      } catch (e) {
        console.error("Invalid token:", e);
      }
    } else {
      // Check localStorage on initial load
      const storedTwitchAuth = localStorage.getItem('twitchAuth');
      if (storedTwitchAuth) {
        setAuth(prev => ({ ...prev, twitch: JSON.parse(storedTwitchAuth) }));
      }
    }
  }, []);

  return <div className="App">{auth.twitch ? <Dashboard auth={auth} /> : <Login />}</div>;
}

export default App;