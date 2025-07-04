import React from 'react';
import './Login.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function Login() {
    const handleLogin = () => {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const authUrl = `${API_BASE_URL}/api/auth/twitch`;

        window.open(authUrl, 'TwitchAuth', `width=${width},height=${height},left=${left},top=${top}`);
    };

    return (
        <div className="login-container">
            <h1>Multi-Platform Stream Updater</h1>
            <p>Connect your accounts to get started.</p>
            <div className="platform-buttons">
                <button className="twitch-btn" onClick={handleLogin}>Connect with Twitch</button>
                <button disabled>Connect with YouTube (Coming Soon)</button>
                <button disabled>Connect with Kick (Coming Soon)</button>
                <button disabled>Connect with Trovo (Coming Soon)</button>
                <button disabled>Connect with TikTok (API Unavailable)</button>
            </div>
        </div>
    );
}

export default Login;