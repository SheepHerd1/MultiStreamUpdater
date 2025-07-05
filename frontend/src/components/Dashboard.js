import React, { useState, useEffect, useCallback } from 'react';
import api from '../api'; // Import our configured axios instance
import './Dashboard.css';


function Dashboard({ auth, onLogout }) {
  // Shared state
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Twitch-specific state
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');

  // YouTube-specific state
  const [description, setDescription] = useState('');
  const [youtubeBroadcastId, setYoutubeBroadcastId] = useState(null);

  // Get auth details from the prop
  const twitchAuth = auth.twitch; // Twitch auth is managed by the parent
  const [youtubeAuth, setYoutubeAuth] = useState(auth.youtube); // Manage YouTube auth locally for responsiveness

  // --- YouTube Auth Handling ---
  // This effect runs once on mount to handle the YouTube OAuth redirect
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      const accessToken = params.get('yt_access_token');
      const refreshToken = params.get('yt_refresh_token');

      if (accessToken) {
        // Store tokens so the parent component can pick them up on next load
        localStorage.setItem('yt_access_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('yt_refresh_token', refreshToken);
        }
        
        // Update our local state immediately to re-render the component
        setYoutubeAuth({ token: accessToken, refreshToken: refreshToken });

        // Clean the URL so the tokens aren't visible and the logic doesn't re-run on refresh
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    }
  }, []); // Empty dependency array ensures this runs only once

  // --- Data Fetching ---
  const fetchTwitchStreamInfo = useCallback(async () => {
    if (!twitchAuth) return;

    try {
      const response = await api.get(`/api/stream/info`, {
        params: { broadcaster_id: twitchAuth.userId },
        headers: { 'Authorization': `Bearer ${twitchAuth.token}` },
      });
      // Let Twitch set the initial title
      setTitle(currentTitle => currentTitle || response.data.title || '');
      setCategory(response.data.game_name || '');
      setTags((response.data.tags || []).join(', '));
    } catch (err) {
      console.error('Could not fetch Twitch info:', err);
      // This error will be caught by the Promise.allSettled in fetchAllStreamInfo
      throw new Error('Failed to fetch Twitch info.');
    }
  }, [twitchAuth]);

  const fetchYouTubeStreamInfo = useCallback(async () => {
    if (!youtubeAuth) return;
    try {
      const response = await api.get(`/api/youtube/stream/info`, {
        headers: { 'Authorization': `Bearer ${youtubeAuth.token}` },
      });
      if (response.data.id) {
        // Let YouTube set the title if Twitch hasn't already
        setTitle(currentTitle => currentTitle || response.data.title || '');
        setDescription(response.data.description || '');
        setYoutubeBroadcastId(response.data.id);
      }
    } catch (err) {
      console.error('Could not fetch YouTube info:', err);
      throw new Error('Failed to fetch YouTube info.');
    }
  }, [youtubeAuth]);

  const fetchAllStreamInfo = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      // Fetch from both platforms in parallel and don't fail if one has an error
      await Promise.allSettled([fetchTwitchStreamInfo(), fetchYouTubeStreamInfo()]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTwitchStreamInfo, fetchYouTubeStreamInfo]);

  // Fetch all stream info when the component first loads or auth changes
  useEffect(() => {
    fetchAllStreamInfo();
  }, [fetchAllStreamInfo]);

  const handleYouTubeConnect = () => {
    const authUrl = `${api.defaults.baseURL}/api/auth/youtube/connect`;
    const windowName = 'youtubeAuth';
    // Center the popup on the screen
    const width = 500;
    const height = 650;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    const windowFeatures = `width=${width},height=${height},top=${top},left=${left}`;

    const popup = window.open(authUrl, windowName, windowFeatures);

    // Poll the popup window to see when it has been closed
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval);
        // After the popup is closed, check localStorage for the new tokens
        // that the popup window should have set.
        const accessToken = localStorage.getItem('yt_access_token');
        const refreshToken = localStorage.getItem('yt_refresh_token');

        // If a new token exists, update the state to re-render the dashboard
        if (accessToken && (!youtubeAuth || accessToken !== youtubeAuth.token)) {
          setYoutubeAuth({ token: accessToken, refreshToken: refreshToken });
        }
      }
    }, 500); // Check every half-second
  };

  // --- Form Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const updatePromises = [];

    // Add Twitch update promise if connected
    if (twitchAuth) {
      const twitchPromise = api.post(
        `/api/stream/update`,
        {
          title,
          category,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          broadcasterId: twitchAuth.userId,
        },
        { headers: { 'Authorization': `Bearer ${twitchAuth.token}`, 'Content-Type': 'application/json' } }
      );
      updatePromises.push(twitchPromise);
    }

    // Add YouTube update promise if connected and we have a broadcast ID
    if (youtubeAuth && youtubeBroadcastId) {
      const youtubePromise = api.post(
        `/api/youtube/stream/update`,
        {
          title,
          description,
          broadcastId: youtubeBroadcastId,
        },
        { headers: { 'Authorization': `Bearer ${youtubeAuth.token}`, 'Content-Type': 'application/json' } }
      );
      updatePromises.push(youtubePromise);
    }

    if (updatePromises.length === 0) {
      setError("No platforms connected to update.");
      setIsLoading(false);
      return;
    }

    try {
      const results = await Promise.allSettled(updatePromises);
      const failedUpdates = results.filter(r => r.status === 'rejected');
      
      if (failedUpdates.length > 0) {
        failedUpdates.forEach(failure => console.error('An update failed:', failure.reason));
        throw new Error('One or more platforms failed to update. Check console.');
      }
      
      alert('Stream(s) updated successfully!');
    } catch (err) {
      console.error('Error updating stream(s):', err);
      setError(err.message || 'Failed to update stream(s). Please check the console.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <button onClick={onLogout} className="logout-btn">Logout</button>
      <h2>Multi-Stream Updater</h2>
      <p>Welcome, {twitchAuth?.userName || 'Streamer'}!</p>
      
      <div className="connected-platforms">
        <h3>Connected Platforms</h3>
        {twitchAuth && <div className="platform-status twitch">Twitch Connected</div>}
        {youtubeAuth ? (
          <div className="platform-status youtube">YouTube Connected</div>
        ) : (
          <button type="button" onClick={handleYouTubeConnect} className="connect-btn youtube">
            Connect YouTube
          </button>
        )}
      </div>

      <div className="stream-editor">
        <h3>Stream Editor</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title (Shared)</label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Stream Title" />
          </div>
          <div className="form-group">
            <label htmlFor="category">Twitch Category</label>
            <input id="category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category/Game" disabled={!twitchAuth} />
          </div>
          <div className="form-group">
            <label htmlFor="description">YouTube Description</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="YouTube video description" disabled={!youtubeAuth} />
          </div>
          <div className="form-group">
            <label htmlFor="tags">Twitch Tags (comma-separated)</label>
            <input id="tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. chill, playingwithviewers" disabled={!twitchAuth} />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isLoading || (!twitchAuth && !youtubeAuth)}>{isLoading ? 'Updating...' : 'Update All Streams'}</button>
            <button type="button" onClick={fetchAllStreamInfo} disabled={isLoading}>Refresh All Info</button>
          </div>
        </form>
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

export default Dashboard;
