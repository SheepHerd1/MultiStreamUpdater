import React, { useState, useEffect, useCallback } from 'react';
import api from '../api'; // Import our configured axios instance
import './Dashboard.css';


function Dashboard({ auth, onLogout }) {
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
  const [youtubeCategory, setYoutubeCategory] = useState({ id: '', name: '' });
  const [youtubeCategoryQuery, setYoutubeCategoryQuery] = useState('');
  const [youtubeCategories, setYoutubeCategories] = useState([]);
  const [youtubeCategoryResults, setYoutubeCategoryResults] = useState([]);
  const [notification, setNotification] = useState('');

  // Get auth details from the prop
  const twitchAuth = auth.twitch; // Twitch auth is managed by the parent
  const [youtubeAuth, setYoutubeAuth] = useState(() => {
    // On initial load, check localStorage directly to restore the session.
    // This is the key to persisting the login across page refreshes.
    const accessToken = localStorage.getItem('yt_access_token');
    if (accessToken) {
      return { token: accessToken, refreshToken: localStorage.getItem('yt_refresh_token') };
    }
    // Fallback to the prop from the parent, or null.
    return auth.youtube || null;
  });

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
      setTwitchCategory(response.data.game_name || '');
      setTags(response.data.tags || []);
    } catch (err) {
      console.error('Could not fetch Twitch info:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch Twitch info.';
      setError(`Twitch Fetch Error: ${errorMessage}`);
    }
  }, [twitchAuth]);

  const fetchYouTubeStreamInfo = useCallback(async () => {
    if (!youtubeAuth) return;
    // Reset status before fetching to provide immediate feedback
    try {
      const response = await api.get(`/api/youtube/stream/info`, {
        headers: { 'Authorization': `Bearer ${youtubeAuth.token}` },
      });
      if (response.data.id) {
        // Let YouTube set the title if Twitch hasn't already
        setTitle(currentTitle => currentTitle || response.data.title || '');
        setDescription(response.data.description || '');
        setYoutubeStreamId(response.data.id);
        setYoutubeUpdateType(response.data.updateType);
        // Find the category name from the full list using the ID
        const categoryName = youtubeCategories.find(c => c.id === response.data.categoryId)?.snippet?.title || '';
        setYoutubeCategory({ id: response.data.categoryId || '', name: categoryName });
      } else if (response.data.message) {
        console.log('YouTube Info:', response.data.message);
      }
    } catch (err) {
      console.error('Could not fetch YouTube info:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch YouTube info.';
      setError(`YouTube Fetch Error: ${errorMessage}`);
    }
  }, [youtubeAuth, youtubeCategories]);

  // Fetch the list of YouTube categories when the component loads
  useEffect(() => {
    const fetchYoutubeCategories = async () => {
      try {
        const response = await api.get('/api/youtube/categories');
        // Filter out non-assignable categories
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

  // Client-side search for YouTube categories
  useEffect(() => {
    if (!youtubeCategoryQuery) {
      setYoutubeCategoryResults([]);
      return;
    }
    const results = youtubeCategories.filter(cat => cat.snippet.title.toLowerCase().includes(youtubeCategoryQuery.toLowerCase()));
    setYoutubeCategoryResults(results);
  }, [youtubeCategoryQuery, youtubeCategories]);

  // Effect to handle auto-hiding the notification message
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification('');
      }, 5000); // Hide after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // This effect handles listening for the auth popup to complete.
  // It runs once when the component mounts and cleans up after itself.
  useEffect(() => {
    const handleStorageChange = (event) => {
      // Listen for the specific key our popup sets in localStorage
      if (event.key === 'yt_access_token') {
        const newAccessToken = event.newValue;
        if (newAccessToken) {
          setYoutubeAuth({ token: newAccessToken, refreshToken: localStorage.getItem('yt_refresh_token') });
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []); // The empty array ensures this runs only once.

  const handleYouTubeConnect = () => {
    const authUrl = `${api.defaults.baseURL}/api/auth/youtube/connect`;
    const windowName = 'youtubeAuth';
    // Center the popup on the screen
    const width = 500;
    const height = 650;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    const windowFeatures = `width=${width},height=${height},top=${top},left=${left}`;

    window.open(authUrl, windowName, windowFeatures);
  };

  // --- Tag Input Handlers ---
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

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

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
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
          category: twitchCategory,
          tags: tags,
          broadcasterId: twitchAuth.userId,
        },
        { headers: { 'Authorization': `Bearer ${twitchAuth.token}`, 'Content-Type': 'application/json' } }
      );
      updatePromises.push(twitchPromise);
    }

    // Add YouTube update promise if connected and we have a broadcast ID
    if (youtubeAuth && youtubeStreamId) {
      const youtubePromise = api.post(
        `/api/youtube/stream/update`,
        {
          title,
          description,
          streamId: youtubeStreamId,
          updateType: youtubeUpdateType,
          categoryId: youtubeCategory.id,
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
      
      setNotification('Stream(s) updated successfully!');
      // After a successful update, re-fetch the latest stream info to update the UI
      setError(''); // Clear any previous errors on success
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
            <label htmlFor="twitchCategory">Twitch Category</label>
            <div className="category-search-container">
              <input
                id="twitchCategory"
                type="text"
                value={twitchCategoryQuery || twitchCategory}
                onChange={(e) => {
                  setTwitchCategory(''); // Clear the selected category when user types
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
            <label htmlFor="description">YouTube Description</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="YouTube video description" disabled={!youtubeAuth} />
          </div>
          <div className="form-group">
            <label htmlFor="youtubeCategory">YouTube Category</label>
            <div className="category-search-container">
              <input
                id="youtubeCategory"
                type="text"
                value={youtubeCategoryQuery || youtubeCategory.name}
                onChange={(e) => {
                  setYoutubeCategory({ id: '', name: '' });
                  setYoutubeCategoryQuery(e.target.value);
                }}
                placeholder="Search for a category..."
                disabled={!youtubeAuth}
              />
              {youtubeCategoryResults.length > 0 && (
                <div className="category-results">
                  {youtubeCategoryResults.map(cat => (
                    <div key={cat.id} className="category-result-item" onClick={() => {
                      setYoutubeCategory({ id: cat.id, name: cat.snippet.title });
                      setYoutubeCategoryQuery('');
                      setYoutubeCategoryResults([]);
                    }}>
                      <span>{cat.snippet.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="tags">Twitch Tags</label>
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
          <div className="form-actions">
            <button type="submit" disabled={isLoading || (!twitchAuth && !youtubeAuth)}>{isLoading ? 'Updating...' : 'Update All Streams'}</button>
            <button type="button" onClick={fetchAllStreamInfo} disabled={isLoading}>Refresh All Info</button>
          </div>
        </form>
        {notification && <div className="notification success">{notification}</div>}
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

export default Dashboard;
