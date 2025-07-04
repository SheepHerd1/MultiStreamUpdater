import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './StreamEditor.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function StreamEditor({ auth }) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState('');
    const [status, setStatus] = useState({ message: '', type: '' }); // Use an object for status
    const [isLoading, setIsLoading] = useState(false);
    const statusTimeoutRef = useRef(null); // Ref to hold the timeout ID

   useEffect(() => {
      // Fetch the current stream info when the component loads to pre-fill the form.
      const fetchStreamInfo = async () => {
         if (auth.twitch) {
            setIsLoading(true);
            setStatus({ message: 'Fetching current stream info...', type: 'info' });
            try {
               const response = await axios.get(`${API_BASE_URL}/api/stream/info`, {
                  params: {
                     broadcaster_id: auth.twitch.userId,
                     token: auth.twitch.token,
                  }
               });
               const { title, game_name } = response.data;
               setTitle(title || '');
               setCategory(game_name || '');
               setStatus({ message: '', type: '' }); // Clear status
            } catch (error) {
               console.error('Could not fetch stream info:', error);
               setStatus({ message: 'Could not fetch current stream info.', type: 'error' });
            } finally {
               setIsLoading(false);
            }
         } else {
            // If auth is null (e.g., user logged out), clear the form fields.
            setTitle('');
            setCategory('');
            setTags('');
            setStatus({ message: '', type: '' });
         }
      };
      fetchStreamInfo();

      // Cleanup function to clear any running timeout when the component unmounts
      return () => {
        clearTimeout(statusTimeoutRef.current);
      };
   }, [auth.twitch]); // This effect runs once the user is authenticated.

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ message: 'Updating...', type: 'info' });

        // Clear any existing status timeout to prevent it from firing prematurely
        clearTimeout(statusTimeoutRef.current);

        try {
            const response = await axios.post(`${API_BASE_URL}/api/stream/update`, {
                title,
                category,
                // Process tags more robustly: split, trim, and filter out any empty strings.
                // This prevents sending `['']` if the input is empty.
                tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
                twitchAuth: auth.twitch,
                // Pass other platform auth tokens here
            });

            const results = response.data;

            let statusMessages = [];
            if (results.twitch) {
                statusMessages.push(results.twitch.success ? 'Twitch: Success!' : `Twitch: ${results.twitch.error}`);
            }
            // Add other platforms here

            setStatus({ message: statusMessages.join(' | '), type: 'success' });

        } catch (error) {
            const errorMessage = error.response?.data?.message || 'An unexpected error occurred.';
            console.error('Error updating stream:', error);
            setStatus({ message: errorMessage, type: 'error' });
        } finally {
            setIsLoading(false);
            // Automatically clear the status message after 5 seconds
            statusTimeoutRef.current = setTimeout(() => {
                setStatus({ message: '', type: '' });
            }, 5000);
        }
    };

    return (
        <div className="stream-editor">
            <h3>Update Stream Info</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="title">Stream Title</label>
                    <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My awesome stream" required disabled={isLoading} />
                </div>
                <div className="form-group">
                    <label htmlFor="category">Category / Game</label>
                    <input type="text" id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Just Chatting" required disabled={isLoading} />
                </div>
                <div className="form-group">
                    <label htmlFor="tags">Tags (comma-separated)</label>
                    <input type="text" id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="chill, ama, gaming" disabled={isLoading} />
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