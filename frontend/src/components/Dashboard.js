import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Dashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function Dashboard({ auth, onLogout }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Get the active Twitch authentication details
  const twitchAuth = auth.twitch;

  const fetchStreamInfo = useCallback(async () => {
    if (!twitchAuth) return;

    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stream/info`, {
        params: {
          broadcaster_id: twitchAuth.userId,
        },
        headers: {
          // This is the secure way to send the token
          'Authorization': `Bearer ${twitchAuth.token}`,
        },
      });
      setTitle(response.data.title || '');
      setCategory(response.data.game_name || '');
      setTags((response.data.tags || []).join(', '));
    } catch (err) {
      console.error('Could not fetch stream info:', err);
      setError('Failed to fetch stream info. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  }, [twitchAuth]);

  // Fetch stream info when the component first loads
  useEffect(() => {
    fetchStreamInfo();
  }, [fetchStreamInfo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!twitchAuth) return;

    setIsLoading(true);
    setError('');
    try {
      await axios.post(
        `${API_BASE_URL}/api/stream/update`,
        {
          title,
          category,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          broadcasterId: twitchAuth.userId,
        },
        {
          headers: {
            'Authorization': `Bearer ${twitchAuth.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      alert('Stream updated successfully!');
    } catch (err) {
      console.error('Error updating stream:', err);
      setError('Failed to update stream. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

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

      <div className="stream-editor">
        <h3>Stream Editor</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Stream Title" />
          </div>
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <input id="category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category/Game" />
          </div>
          <div className="form-group">
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input id="tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. chill, playingwithviewers" />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isLoading}>{isLoading ? 'Updating...' : 'Update Stream'}</button>
            <button type="button" onClick={fetchStreamInfo} disabled={isLoading}>Refresh Info</button>
          </div>
        </form>
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

export default Dashboard;
