import React from 'react';
import './Login.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function Login() {
    return (
        <div className="login-container">
            <h1>Multi-Platform Stream Updater</h1>
            <p>Connect your accounts to get started.</p>
            <div className="platform-buttons">
                <a href={`${API_BASE_URL}/api/auth/twitch`}>
                    <button className="twitch-btn">Connect with Twitch</button>
                </a>
                <button disabled>Connect with YouTube (Coming Soon)</button>
                <button disabled>Connect with Kick (Coming Soon)</button>
                <button disabled>Connect with Trovo (Coming Soon)</button>
                <button disabled>Connect with TikTok (API Unavailable)</button>
            </div>
        </div>
    );
}

export default Login;