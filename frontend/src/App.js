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
    // This effect handles the entire authentication flow.
    // It prioritizes finding a token in the URL hash, which is where Twitch redirects.
    // If no token is found, it falls back to checking for a saved session in localStorage.

    // 1. Check for authentication tokens in the URL hash (#).
    // The hash looks like '#key1=value1&key2=value2', so we treat it like a search query.
    const hashParams = new URLSearchParams(window.location.hash.substring(1)); // remove the '#'
    const twitchToken = hashParams.get('twitch_access_token');

    if (twitchToken) { // A token was found in the hash.
      try {
        const decoded = jwtDecode(twitchToken);
        const twitchAuth = {
          token: twitchToken,
          userId: decoded.user_id,
          userName: decoded.preferred_username || 'user',
        };

        // Set the auth state and save the session to localStorage.
        setAuth(prev => ({ ...prev, twitch: twitchAuth }));
        localStorage.setItem('twitchAuth', JSON.stringify(twitchAuth));

        // Clean the token from the URL hash for security and aesthetics.
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch (e) {
        console.error("Invalid token:", e);
      }
    } else {
      // 2. No token in hash, so check for a saved session in localStorage.
      const storedTwitchAuth = localStorage.getItem('twitchAuth');
      if (storedTwitchAuth) {
        try {
          setAuth(prev => ({ ...prev, twitch: JSON.parse(storedTwitchAuth) }));
        } catch (e) {
          console.error("Failed to parse auth from localStorage", e);
          localStorage.removeItem('twitchAuth'); // Clear corrupted data.
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