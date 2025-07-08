import React, { useState } from 'react';
import './Login.css';
import TwitchIcon from './icons/TwitchIcon';
import YouTubeIcon from './icons/YouTubeIcon';
import KickIcon from './icons/KickIcon';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://multi-stream-updater.vercel.app';

const loginPlatforms = [
    { key: 'twitch', name: 'Twitch', Icon: TwitchIcon },
    { key: 'youtube', name: 'YouTube', Icon: YouTubeIcon },
    { key: 'kick', name: 'Kick', Icon: KickIcon },
];

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
                    {loginPlatforms.map(({ key, name, Icon }) => (
                        <button key={key} className={`platform-btn ${key}-btn`} onClick={() => handleLogin(key)} disabled={!!authenticating}>
                            <Icon className="platform-icon" />
                            {authenticating === key ? 'Authenticating...' : `Connect with ${name}`}
                        </button>
                    ))}
                    <div className="coming-soon">
                        <button className="platform-btn" disabled>Connect with Trovo (Coming Soon)</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;