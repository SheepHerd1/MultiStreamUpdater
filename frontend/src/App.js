import React, { useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

/**
 * A helper function to safely get the initial authentication state from localStorage on first load.
 */
const getInitialAuthState = () => {
  const storedTwitchAuth = localStorage.getItem('twitchAuth');
  if (storedTwitchAuth) {
    try {
      // We just need to parse it, the full user info is already there.
      return { twitch: JSON.parse(storedTwitchAuth) };
    } catch (e) {
      localStorage.removeItem('twitchAuth');
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
    const handleAuthMessage = (event) => {
      // Ensure the message is from a trusted source if necessary, but for now, check the type.
      if (event.data.type === 'twitch-auth-success') {
        const { token, id_token } = event.data;
        if (token && id_token) {
          try {
            const decoded = jwtDecode(id_token);
            const fullAuth = {
              token: token,
              userId: decoded.sub,
              userName: decoded.preferred_username || 'user',
            };
            // Save the full session to localStorage
            localStorage.setItem('twitchAuth', JSON.stringify(fullAuth));
            // Update the state to show the dashboard
            setAuth({ twitch: fullAuth });
          } catch (e) {
            console.error("Failed to process token from popup:", e);
          }
        }
      }
    };

    // Set up the event listener
    window.addEventListener('message', handleAuthMessage);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('message', handleAuthMessage);
    };
  }, []); // Empty dependency array ensures this runs only once.

  return (
    <div className="App">
      {auth.twitch ? <Dashboard auth={auth} onLogout={handleLogout} /> : <Login />}
    </div>
  );
}

export default App;