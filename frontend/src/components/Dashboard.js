import React from 'react';
import StreamEditor from './StreamEditor';
import './Dashboard.css';

function Dashboard({ auth }) {
    return (
        <div className="dashboard">
            <h2>Dashboard</h2>
            <p>Welcome, {auth.twitch?.userName || 'Streamer'}!</p>
            
            <div className="connected-platforms">
                <h3>Connected Platforms</h3>
                {auth.twitch && <div className="platform-status twitch">Twitch Connected</div>}
                {/* Add other platforms here as they are implemented */}
            </div>

            <StreamEditor auth={auth} />
        </div>
    );
}

export default Dashboard;