import React, { useState } from 'react';
import './Login.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://multi-stream-updater.vercel.app';

function Login() {
    const [authenticating, setAuthenticating] = useState(null); // Can be 'twitch', 'youtube', etc.

    const handleLogin = (platform) => {
        setAuthenticating(platform);
        const width = 500;
        const height = 650;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        // Correctly point to the '/connect' endpoint for each platform
        const authUrl = `${API_BASE_URL}/api/auth/${platform}/connect`;

        const authWindow = window.open(authUrl, `${platform}Auth`, `width=${width},height=${height},left=${left},top=${top}`);

        // Handle popup blockers
        if (!authWindow) {
            alert('Popup blocked! Please allow popups for this site to authenticate.');
            setAuthenticating(null);
            return;
        }

        // The parent App.js component is listening for the auth message.
        // We just need to re-enable the button if the user closes the popup manually.
        const checkPopup = setInterval(() => {
            if (authWindow.closed) {
                clearInterval(checkPopup);
                // Only reset the button state if auth wasn't successful.
                // The success case is handled by App.js, which will unmount this component.
                setAuthenticating(null);
            }
        }, 1000);
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1>Multi-Stream Updater</h1>
                <p>Connect your accounts to get started.</p>
                <div className="platform-buttons">
                    <button className="platform-btn twitch-btn" onClick={() => handleLogin('twitch')} disabled={!!authenticating}>
                        {authenticating === 'twitch' ? 'Authenticating...' : 'Connect with Twitch'}
                    </button>
                    <button className="platform-btn youtube-btn" onClick={() => handleLogin('youtube')} disabled={!!authenticating}>
                        {authenticating === 'youtube' ? 'Authenticating...' : 'Connect with YouTube'}
                    </button>
                    <div className="coming-soon">
                        <button className="platform-btn" disabled>Connect with Kick (Coming Soon)</button>
                        <button className="platform-btn" disabled>Connect with Trovo (Coming Soon)</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;