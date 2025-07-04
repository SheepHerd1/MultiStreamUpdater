import React, { useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

/**
 * A helper function to safely get the initial authentication state from localStorage.
 * This runs before the component renders to prevent a flash of the login screen.
 */
const getInitialAuthState = () => {
  console.log("1. Checking for authentication state...");
  // Check for a permanent session first.
  let storedTwitchAuth = localStorage.getItem('twitchAuth');

  // Check for a temporary token from the callback page.
  const tempAuth = localStorage.getItem('twitchAuthTemp');
  if (tempAuth) {
    console.log("2. Found temporary token from callback page.");
    storedTwitchAuth = tempAuth; // Prioritize the new token.
    localStorage.removeItem('twitchAuthTemp'); // Clean up the temporary item.
  }

  if (storedTwitchAuth) {
    console.log("3. Processing stored token...");
    try {
      const parsedAuth = JSON.parse(storedTwitchAuth); // Contains access_token and id_token
      // We decode the id_token (a JWT), not the access_token (an opaque string).
      const decoded = jwtDecode(parsedAuth.id_token);
      // Save the full auth object to the permanent session.
      const fullAuth = {
        token: parsedAuth.token, // The access_token for API calls
        userId: decoded.sub, // The user's ID is in the 'sub' (subject) claim
        userName: decoded.preferred_username || 'user'
      };
      localStorage.setItem('twitchAuth', JSON.stringify(fullAuth));
      console.log("4. Successfully decoded token. User is authenticated.");
      return { twitch: fullAuth };
    } catch (e) {
      console.error("5. ERROR: Failed to parse or decode token.", e);
      localStorage.removeItem('twitchAuth'); // Clear corrupted data
    }
  }
  console.log("6. No valid token found. User is not authenticated.");
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

  return (
    <div className="App">
      {auth.twitch ? <Dashboard auth={auth} onLogout={handleLogout} /> : <Login />}
    </div>
  );
}

export default App;