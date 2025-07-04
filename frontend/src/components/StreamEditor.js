import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './StreamEditor.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function StreamEditor({ auth }) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState('');
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

   useEffect(() => {
      // Fetch the current stream info when the component loads to pre-fill the form.
      const fetchStreamInfo = async () => {
         if (auth.twitch) {
            setIsLoading(true);
            setStatus('Fetching current stream info...');
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
               setStatus(''); // Clear status after successful fetch
            } catch (error) {
               console.error('Could not fetch stream info:', error);
               setStatus('Could not fetch current stream info.');
            } finally {
               setIsLoading(false);
            }
         } else {
            // If auth is null (e.g., user logged out), clear the form fields.
            setTitle('');
            setCategory('');
            setTags('');
            setStatus('');
         }
      };
      fetchStreamInfo();
   }, [auth.twitch]); // This effect runs once the user is authenticated.

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus('Updating...');

        try {
            const response = await axios.post(`${API_BASE_URL}/api/stream/update`, {
                title,
                category,
                tags: tags.split(',').map(t => t.trim()),
                twitchAuth: auth.twitch,
                // Pass other platform auth tokens here
            });

            const results = response.data;

            let statusMessages = [];
            if (results.twitch) {
                statusMessages.push(results.twitch.success ? 'Twitch: Success!' : `Twitch: ${results.twitch.error}`);
            }
            // Add other platforms here

            setStatus(statusMessages.join(' | '));

        } catch (error) {
            console.error('Error updating stream:', error);
            setStatus('An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="stream-editor">
            <h3>Update Stream Info</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="title">Stream Title</label>
                    <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My awesome stream" required />
                </div>
                <div className="form-group">
                    <label htmlFor="category">Category / Game</label>
                    <input type="text" id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Just Chatting" required />
                </div>
                <div className="form-group">
                    <label htmlFor="tags">Tags (comma-separated)</label>
                    <input type="text" id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="chill, ama, gaming" />
                </div>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Updating...' : 'Update All Platforms'}
                </button>
            </form>
            {status && (
                <p className="status-message">
                    {isLoading && <span className="spinner"></span>}
                    {status}
                </p>
            )}
        </div>
    );
}

export default StreamEditor;