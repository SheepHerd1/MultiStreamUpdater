import React, { useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

/**
 * A helper function to safely get the initial authentication state from localStorage.
 * This runs before the component renders to prevent a flash of the login screen.
 */
const getInitialAuthState = () => {
  const storedTwitchAuth = localStorage.getItem('twitchAuth');
  if (storedTwitchAuth) {
    try {
      return { twitch: JSON.parse(storedTwitchAuth) };
    } catch (e) {
      localStorage.removeItem('twitchAuth'); // Clear corrupted data
    }
  }
  return { twitch: null };
};

function App() {
  const [auth, setAuth] = useState(getInitialAuthState());

  const handleLogout = () => {
    // Clear the auth state in React
    setAuth({ twitch: null });
    // Remove the persisted session from the browser's storage
    localStorage.removeItem('twitchAuth');
  };

  useEffect(() => {
    // This effect's only job is to handle a new login from the URL hash.
    const hashParams = new URLSearchParams(window.location.hash.substring(1)); // remove the '#'
    const twitchToken = hashParams.get('twitch_access_token');

    if (twitchToken) { // A new token was found in the hash.
      try {
        const decoded = jwtDecode(twitchToken);
        const twitchAuth = {
          token: twitchToken,
          userId: decoded.user_id,
          userName: decoded.preferred_username || 'user'
        };
        // Save the new session to localStorage
        localStorage.setItem('twitchAuth', JSON.stringify(twitchAuth));
        // Update the component's state to show the dashboard
        setAuth({ twitch: twitchAuth });
        // Clean the token from the URL hash without a page reload
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch (e) {
        console.error("Invalid token:", e);
        // If the token is bad, just clean the URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
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