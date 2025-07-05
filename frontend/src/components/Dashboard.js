import React from 'react';
import StreamEditor from './StreamEditor';
import './Dashboard.css';

function Dashboard({ auth, onLogout }) {
    return (
        <div className="dashboard">
            <button onClick={onLogout} className="logout-btn">Logout</button>
            <h2>Dashboard</h2>
            <p>Welcome, {auth.twitch?.userName || 'Streamer'}!</p>
            
            <div className="connected-platforms">
                <h3>Connected Platforms</h3>
                {auth.twitch && <div className="platform-status twitch">Twitch Connected</div>}
                {auth.youtube && <div className="platform-status youtube">YouTube Connected</div>}
            </div>

            <StreamEditor auth={auth} />
        </div>
    );
}

export default Dashboard;