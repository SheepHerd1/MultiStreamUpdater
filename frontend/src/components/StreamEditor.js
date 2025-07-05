import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './StreamEditor.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function StreamEditor({ auth }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [platforms, setPlatforms] = useState({
        twitch: !!auth.twitch,
        youtube: !!auth.youtube,
    });
    const [status, setStatus] = useState({ message: '', type: '' }); // Use an object for status
    const [isLoading, setIsLoading] = useState(false);
    const statusTimeoutRef = useRef(null); // Ref to hold the timeout ID

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
        clearTimeout(statusTimeoutRef.current);
        };
    }, []);

    const handleFetchInfo = async () => {
        setIsLoading(true);
        setStatus({ message: 'Fetching current stream info...', type: 'info' });
        try {
            const response = await axios.post(`${API_BASE_URL}/api/stream/info`, auth);
            const data = response.data;

            // Prioritize YouTube for richer data, fallback to Twitch
            const source = data.youtube?.title ? data.youtube : data.twitch;
            if (source && !source.error) {
                setTitle(source.title || '');
                setDescription(source.description || '');
                setStatus({ message: 'Successfully fetched current info.', type: 'success' });
            } else {
                const errorMessage = data.youtube?.error || data.twitch?.error || 'Could not fetch info.';
                setStatus({ message: errorMessage, type: 'error' });
            }
        } catch (error) {
            console.error('Could not fetch stream info:', error);
            setStatus({ message: 'Could not fetch current stream info.', type: 'error' });
        } finally {
            setIsLoading(false);
            statusTimeoutRef.current = setTimeout(() => setStatus({ message: '', type: '' }), 5000);
        }
    };

    const handlePlatformChange = (e) => {
        const { name, checked } = e.target;
        setPlatforms(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ message: 'Updating...', type: 'info' });
        clearTimeout(statusTimeoutRef.current);

        try {
            const payload = {
                ...auth,
                title,
                description,
                platforms,
            };
            const response = await axios.post(`${API_BASE_URL}/api/stream/update`, payload);
            const results = response.data;

            const statusMessages = Object.entries(results).map(([platform, result]) => {
                const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
                return result.success
                    ? `${platformName}: Success!`
                    : `${platformName}: ${result.error || 'Failed.'}`;
            });

            const isAllSuccess = Object.values(results).every(r => r.success);
            setStatus({
                message: statusMessages.join(' | '),
                type: isAllSuccess ? 'success' : 'error',
            });
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'An unexpected error occurred.';
            console.error('Error updating stream:', error);
            setStatus({ message: errorMessage, type: 'error' });
        } finally {
            setIsLoading(false);
            statusTimeoutRef.current = setTimeout(() => setStatus({ message: '', type: '' }), 8000);
        }
    };

    return (
        <div className="stream-editor">
            <h3>Update Stream Info</h3>
            <button onClick={handleFetchInfo} disabled={isLoading} className="fetch-btn">
                Fetch Current Info
            </button>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="title">Stream Title</label>
                    <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My awesome stream" required disabled={isLoading} />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Description (YouTube)</label>
                    <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details about today's stream..." rows="4" disabled={isLoading || !platforms.youtube} />
                </div>
                <div className="form-group platform-selector">
                    <h4>Update on:</h4>
                    {auth.twitch && (
                        <label>
                            <input type="checkbox" name="twitch" checked={platforms.twitch} onChange={handlePlatformChange} disabled={isLoading} />
                            Twitch
                        </label>
                    )}
                    {auth.youtube && (
                        <label>
                            <input type="checkbox" name="youtube" checked={platforms.youtube} onChange={handlePlatformChange} disabled={isLoading} />
                            YouTube
                        </label>
                    )}
                </div>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Updating...' : 'Update All Platforms'}
                </button>
            </form>
            {status.message && (
                <p className={`status-message ${status.type}`}>
                    {isLoading && <span className="spinner"></span>}
                    {status.message}
                </p>
            )}
        </div>
    );
}

export default StreamEditor;