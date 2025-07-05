import React, { useState, useEffect } from 'react';
import './Login.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
// The origin of your Vercel backend
const API_ORIGIN = new URL(API_BASE_URL).origin;

function Login() {
    const [authenticating, setAuthenticating] = useState(null); // Can be 'twitch', 'youtube', etc.

    useEffect(() => {
        const handleAuthMessage = (event) => {
            // Security: alys check the origin of the message
            if (event.origin !== API_ORIGIN) {
                console.warn(`Message from unexpected origin: ${event.origin}`);
                return;
            }

            const { type, data } = event.data;

            if (type === 'auth-success') {
                console.log(`${data.provider} authentication successful!`, data);
                // You can now store the tokens
                localStorage.setItem(`${data.provider}_access_token`, data.accessToken);
                localStorage.setItem(`${data.provider}_id_token`, data.idToken);
                alert(`Successfully connected with ${data.provider}!`);
            } else if (type === 'auth-error') {
                console.error(`${data.provider} authentication failed:`, data.error);
                alert(`Failed to connect with ${data.provider}. Please try again.`);
            }

            // Stop listening and re-enable buttons
            setAuthenticating(null);
        };

        window.addEventListener('message', handleAuthMessage);

        // Cleanup: remove the listener when the component unmounts
        return () => {
            window.removeEventListener('message', handleAuthMessage);
        };
    }, []); // The empty dependency array means this effect runs only once on mount

    const handleLogin = (platform) => {
        setAuthenticating(platform);
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const authUrl = `${API_BASE_URL}/api/auth/${platform}`;

        window.open(authUrl, `${platform}Auth`, `width=${width},height=${height},left=${left},top=${top}`);
    };

    return (
        <div className="login-container">
            <h1>Multi-Platform Stream Updater</h1>
            <p>Connect your accounts to get started.</p>
            <div className="platform-buttons">
                <button className="twitch-btn" onClick={() => handleLogin('twitch')} disabled={!!authenticating}>
                    {authenticating === 'twitch' ? 'Authenticating...' : 'Connect with Twitch'}
                </button>
                <button onClick={() => handleLogin('youtube')} disabled={!!authenticating}>
                    {authenticating === 'youtube' ? 'Authenticating...' : 'Connect with YouTube'}
                </button>
                <button disabled>Connect with Kick (Coming Soon)</button>
                <button disabled>Connect with Trovo (Coming Soon)</button>
                <button disabled>Connect with TikTok (API Unavailable)</button>
            </div>
        </div>
    );
}

export default Login;