import React, { useState, useEffect, useCallback } from 'react';
import api from '../api'; // Import our configured axios instance
import './Dashboard.css';
import PlatformCard from './PlatformCard';


function Dashboard({ auth, onLogout, setAuth }) {
  // Shared state
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Twitch-specific state
  const [twitchCategory, setTwitchCategory] = useState('');
  const [twitchCategoryQuery, setTwitchCategoryQuery] = useState('');
  const [twitchCategoryResults, setTwitchCategoryResults] = useState([]);
  const [isTwitchCategoryLoading, setIsTwitchCategoryLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  // YouTube-specific state
  const [description, setDescription] = useState('');
  const [youtubeStreamId, setYoutubeStreamId] = useState(null);
  const [youtubeUpdateType, setYoutubeUpdateType] = useState(null);
  const [youtubeCategoryId, setYoutubeCategoryId] = useState('');
  const [youtubeCategories, setYoutubeCategories] = useState([]);
  const [notification, setNotification] = useState('');

  // Get auth details from the prop
  const { twitch: twitchAuth, youtube: youtubeAuth } = auth;

  // --- Data Fetching ---
  const fetchTwitchStreamInfo = useCallback(async () => {
    if (!twitchAuth) return;
    try {
      const response = await api.get(`/api/stream/info`, {
        params: { broadcaster_id: twitchAuth.userId },
        headers: { 'Authorization': `Bearer ${twitchAuth.token}` },
      });
      setTitle(currentTitle => currentTitle || response.data.title || '');
      setTwitchCategory(response.data.game_name || '');
      setTags(response.data.tags || []);
    } catch (err) {
      console.error('Could not fetch Twitch info:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch Twitch info.';
      setError(prev => prev ? `${prev}\nTwitch: ${errorMessage}` : `Twitch: ${errorMessage}`);
    }
  }, [twitchAuth]);

  const fetchYouTubeStreamInfo = useCallback(async () => {
    if (!youtubeAuth) return;
    try {
      const response = await api.get(`/api/youtube/stream/info`, {
        headers: { 'Authorization': `Bearer ${youtubeAuth.token}` },
      });
      if (response.data.id) {
        setTitle(currentTitle => currentTitle || response.data.title || '');
        setDescription(response.data.description || '');
        setYoutubeStreamId(response.data.id);
        setYoutubeUpdateType(response.data.updateType);
        setYoutubeCategoryId(response.data.categoryId || '');
      } else if (response.data.message) {
        console.log('YouTube Info:', response.data.message);
      }
    } catch (err) {
      console.error('Could not fetch YouTube info:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch YouTube info.';
      setError(prev => prev ? `${prev}\nYouTube: ${errorMessage}` : `YouTube: ${errorMessage}`);
    }
  }, [youtubeAuth]);

  useEffect(() => {
    const fetchYoutubeCategories = async () => {
      try {
        const response = await api.get('/api/youtube/categories');
        const assignableCategories = response.data.filter(cat => cat.snippet?.assignable);
        setYoutubeCategories(assignableCategories);
      } catch (error) {
        console.error("Could not fetch YouTube categories", error);
      }
    };
    fetchYoutubeCategories();
  }, []);

  const fetchAllStreamInfo = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      await Promise.allSettled([fetchTwitchStreamInfo(), fetchYouTubeStreamInfo()]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTwitchStreamInfo, fetchYouTubeStreamInfo]);

  useEffect(() => {
    fetchAllStreamInfo();
  }, [fetchAllStreamInfo]);

  // Debounced search for Twitch categories
  const searchTwitchCategories = useCallback(async (query) => {
    if (!query) {
      setTwitchCategoryResults([]);
      return;
    }
    setIsTwitchCategoryLoading(true);
    try {
      const response = await api.get(`/api/twitch/categories?query=${query}`);
      setTwitchCategoryResults(response.data);
    } catch (error) {
      console.error('Error searching categories:', error);
    } finally {
      setIsTwitchCategoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => searchTwitchCategories(twitchCategoryQuery), 300);
    return () => clearTimeout(handler);
  }, [twitchCategoryQuery, searchTwitchCategories]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleYouTubeConnect = () => {
    const authUrl = `${api.defaults.baseURL}/api/auth/youtube/connect`;
    const width = 500, height = 650;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    const windowFeatures = `width=${width},height=${height},top=${top},left=${left}`;
    window.open(authUrl, 'youtubeAuth', windowFeatures);
  };

  const handleTwitchConnect = () => {
    const authUrl = `${api.defaults.baseURL}/api/auth/twitch/connect`;
    const width = 500, height = 650;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    const windowFeatures = `width=${width},height=${height},top=${top},left=${left}`;
    window.open(authUrl, 'twitchAuth', windowFeatures);
  };

  const handleTagInputChange = (e) => setTagInput(e.target.value);

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag) && tags.length < 10) {
        setTags([...tags, newTag]);
        setTagInput('');
      }
    } else if (e.key === 'Backspace' && !tagInput) {
      e.preventDefault();
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove) => setTags(tags.filter(tag => tag !== tagToRemove));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setNotification('');

    const updatePromises = [];

    if (twitchAuth) {
      updatePromises.push(api.post(`/api/stream/update`, {
        title, category: twitchCategory, tags, broadcasterId: twitchAuth.userId,
      }, { headers: { 'Authorization': `Bearer ${twitchAuth.token}` } }));
    }

    if (youtubeAuth && youtubeStreamId) {
      updatePromises.push(api.post(`/api/youtube/stream/update`, {
        title, description, streamId: youtubeStreamId, updateType: youtubeUpdateType, categoryId: youtubeCategoryId,
      }, { headers: { 'Authorization': `Bearer ${youtubeAuth.token}` } }));
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
      setNotification('Stream(s) updated successfully!');
      setError('');
      fetchAllStreamInfo();
    } catch (err) {
      console.error('Error updating stream(s):', err);
      setError(err.message || 'Failed to update stream(s). Please check the console.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Multi-Stream Updater</h2>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
      <p>Welcome, {twitchAuth?.userName || 'Streamer'}!</p>
      
      <div className="connected-platforms">
        <div className={`platform-status twitch ${twitchAuth ? 'connected' : ''}`}>
          Twitch {twitchAuth ? 'Connected' : 'Not Connected'}
          {!twitchAuth && (
            <button type="button" onClick={handleTwitchConnect} className="connect-btn twitch">
              Connect
            </button>
          )}
        </div>
        <div className={`platform-status youtube ${youtubeAuth ? 'connected' : ''}`}>
          YouTube {youtubeAuth ? 'Connected' : 'Not Connected'}
          {!youtubeAuth && (
            <button type="button" onClick={handleYouTubeConnect} className="connect-btn youtube">
              Connect
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="stream-editor-layout">
          <PlatformCard title="Shared Information" className="shared-card">
            <div className="form-group">
              <label htmlFor="title">Stream Title</label>
              <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your stream title..." disabled={!twitchAuth && !youtubeAuth} />
            </div>
          </PlatformCard>

          <PlatformCard title="Twitch Settings" className="twitch-card" isConnected={!!twitchAuth}>
            <div className="form-group">
              <label htmlFor="twitchCategory">Category</label>
              <div className="category-search-container">
                <input
                  id="twitchCategory"
                  type="text"
                  value={twitchCategoryQuery || twitchCategory}
                  onChange={(e) => {
                    setTwitchCategory('');
                    setTwitchCategoryQuery(e.target.value);
                  }}
                  placeholder="Search for a category..."
                  disabled={!twitchAuth}
                />
                {twitchCategoryResults.length > 0 && (
                  <div className="category-results">
                    {isTwitchCategoryLoading ? <div>Loading...</div> :
                      twitchCategoryResults.map(cat => (
                        <div key={cat.id} className="category-result-item" onClick={() => {
                          setTwitchCategory(cat.name);
                          setTwitchCategoryQuery('');
                          setTwitchCategoryResults([]);
                        }}>
                          <img src={cat.box_art_url.replace('{width}', '30').replace('{height}', '40')} alt="" />
                          <span>{cat.name}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="tags">Tags (up to 10)</label>
              <div className="tag-input-container" tabIndex="0">
                {tags.map(tag => (
                  <div key={tag} className="tag-item">
                    {tag}
                    <button type="button" className="tag-remove-btn" onClick={() => removeTag(tag)}>&times;</button>
                  </div>
                ))}
                <input
                  id="tags"
                  type="text"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder={tags.length < 10 ? "Add a tag..." : "Max 10 tags"}
                  disabled={!twitchAuth || tags.length >= 10}
                />
              </div>
            </div>
          </PlatformCard>

          <PlatformCard title="YouTube Settings" className="youtube-card" isConnected={!!youtubeAuth}>
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="YouTube video description..." rows="4" disabled={!youtubeAuth} />
            </div>
            <div className="form-group">
              <label htmlFor="youtubeCategory">Category</label>
              <select id="youtubeCategory" value={youtubeCategoryId} onChange={(e) => setYoutubeCategoryId(e.target.value)} disabled={!youtubeAuth}>
                <option value="">-- Select a Category --</option>
                {youtubeCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.snippet.title}</option>
                ))}
              </select>
            </div>
          </PlatformCard>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={isLoading || (!twitchAuth && !youtubeAuth)}>{isLoading ? 'Updating...' : 'Update All Streams'}</button>
          <button type="button" onClick={fetchAllStreamInfo} disabled={isLoading} className="secondary-action">Refresh All Info</button>
        </div>
      </form>
      
      {notification && <div className="notification success">{notification}</div>}
      {error && <div className="notification error">{error}</div>}
    </div>
  );
}

export default Dashboard;
