import React, { useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

/**
 * A helper function to safely get the initial authentication state from localStorage on first load.
 */
const getInitialAuthState = () => {
  const authState = { twitch: null, youtube: null };
  const storedTwitchAuth = localStorage.getItem('twitchAuth');
  const storedYouTubeAuth = localStorage.getItem('youtubeAuth');

  if (storedTwitchAuth) {
    try {
      // We just need to parse it, the full user info is already there.
      authState.twitch = JSON.parse(storedTwitchAuth);
    } catch (e) {
      localStorage.removeItem('twitchAuth');
    }
  }
  if (storedYouTubeAuth) {
    try {
      authState.youtube = JSON.parse(storedYouTubeAuth);
    } catch (e) {
      localStorage.removeItem('youtubeAuth');
    }
  }
  return authState;
};

function App() {
  const [auth, setAuth] = useState(getInitialAuthState());

  const handleLogout = () => {
    // Clear the auth state in React
    setAuth({ twitch: null, youtube: null });
    // Remove the persisted session from the browser's storage
    localStorage.removeItem('twitchAuth');
    localStorage.removeItem('youtubeAuth');
  };

  useEffect(() => {
    const handleAuthMessage = (event) => {
      // Ensure the message is from a trusted source if necessary, but for now, check the type.
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
      } else if (event.data.type === 'youtube-auth-success' && event.data.authData) {
        try {
          // The backend provides the necessary auth data.
          // We store it in the same way as Twitch for consistency.
          localStorage.setItem('youtubeAuth', JSON.stringify(event.data.authData));
          setAuth(prevAuth => ({ ...prevAuth, youtube: event.data.authData }));
        } catch (e) {
          console.error("Failed to process YouTube auth data from popup:", e);
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
      {auth.twitch || auth.youtube ? <Dashboard auth={auth} onLogout={handleLogout} /> : <Login />}
    </div>
  );
}

export default App;