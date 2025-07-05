import React, { useState } from 'react';
import './Login.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function Login() {
    const [authenticating, setAuthenticating] = useState(null); // Can be 'twitch', 'youtube', etc.

    const handleLogin = (platform) => {
        setAuthenticating(platform);
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const authUrl = `${API_BASE_URL}/api/auth/${platform}`;

        const authWindow = window.open(authUrl, `${platform}Auth`, `width=${width},height=${height},left=${left},top=${top}`);

        // Check if the popup was closed by the user and re-enable the button
        const checkPopup = setInterval(() => {
            if (!authWindow || authWindow.closed) {
                clearInterval(checkPopup);
                setAuthenticating(null);
            }
        }, 1000);
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