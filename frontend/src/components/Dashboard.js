import React, { useState, useEffect, useCallback } from 'react';
import api from '../api'; // Import our configured axios instance
import { useTokenRefresh } from '../context/TokenRefreshContext';
import './Dashboard.css';
import { useTwitchStream } from '../hooks/useTwitchStream';
import { useYouTubeStream } from '../hooks/useYouTubeStream';
import { useKickStream } from '../hooks/useKickStream';
import PlatformCard from './PlatformCard';
import TwitchIcon from './icons/TwitchIcon';
import YouTubeIcon from './icons/YouTubeIcon';
import KickIcon from './icons/KickIcon';
import Spinner from './icons/Spinner';
import UserMenu from './UserMenu';

function Dashboard({ auth, onLogout, onIndividualLogout, setAuth }) {
  // Shared state
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState({}); // Use an object for platform-specific errors
  const [notification, setNotification] = useState('');

  // Get auth details from the prop
  const { twitch: twitchAuth, youtube: youtubeAuth, kick: kickAuth } = auth;

  // --- Custom Hooks for Platform Logic ---
  const {
    twitchCategory, setTwitchCategory, twitchCategoryQuery, setTwitchCategoryQuery,
    twitchCategoryResults, setTwitchCategoryResults, isTwitchCategoryLoading,
    tags, tagInput, handleTagInputChange, handleTagInputKeyDown, removeTag,
    fetchTwitchStreamInfo
  } = useTwitchStream(twitchAuth, setTitle, setError);

  const {
    description, setDescription, youtubeStreamId, youtubeUpdateType,
    youtubeCategoryId, setYoutubeCategoryId, youtubeCategories,
    fetchYouTubeStreamInfo
  } = useYouTubeStream(youtubeAuth, setTitle, setError);

  const {
    kickCategory,
    setKickCategory,
    fetchKickStreamInfo
  } = useKickStream(kickAuth, setTitle, setError);

  // Get token refreshing state from context
  const { isRefreshing } = useTokenRefresh();

  const fetchAllStreamInfo = useCallback(async () => {
    setIsLoading(true);
    setError({}); // Clear previous errors
    try {
      // The fetch functions are now dependencies of this callback
      await Promise.allSettled([
        fetchTwitchStreamInfo(),
        fetchYouTubeStreamInfo(),
        fetchKickStreamInfo()
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTwitchStreamInfo, fetchYouTubeStreamInfo, fetchKickStreamInfo]);

  useEffect(() => {
    fetchAllStreamInfo();
  }, [fetchAllStreamInfo]);

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

  const handleKickConnect = () => {
    const authUrl = `${api.defaults.baseURL}/api/auth/kick/connect`;
    const width = 500, height = 650;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    const windowFeatures = `width=${width},height=${height},top=${top},left=${left}`;
    window.open(authUrl, 'kickAuth', windowFeatures);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError({}); // Clear previous errors
    setNotification('');

    const updateOperations = [];

    if (twitchAuth) {
      updateOperations.push({
        platform: 'twitch',
        promise: api.post(`/api/twitch?action=stream_update`, {
          title, category: twitchCategory, tags, broadcasterId: twitchAuth.userId,
        }, { headers: { 'Authorization': `Bearer ${twitchAuth.token}` } })
      });
    }

    if (youtubeAuth && youtubeStreamId) {
      updateOperations.push({
        platform: 'youtube',
        promise: api.post(`/api/youtube?action=stream_update`, {
          title, description, streamId: youtubeStreamId, updateType: youtubeUpdateType, categoryId: youtubeCategoryId,
        }, { headers: { 'Authorization': `Bearer ${youtubeAuth.token}` } })
      });
    }

    if (kickAuth) {
      updateOperations.push({
        platform: 'kick',
        promise: api.post(`/api/kick?action=stream_update`, {
          channel: kickAuth.userName,
          title,
          category: kickCategory,
        }, { headers: { 'Authorization': `Bearer ${kickAuth.token}` } })
      });
    }

    if (updateOperations.length === 0) {
      setError({ general: "No platforms connected to update." });
      setIsLoading(false);
      return;
    }

    try {
      const results = await Promise.allSettled(updateOperations.map(op => op.promise));
      
      const newErrors = {};
      let hasFailures = false;

      results.forEach((result, index) => {
        const platform = updateOperations[index].platform;
        if (result.status === 'rejected') {
          hasFailures = true;
          const reason = result.reason;
          const errorMessage = reason.response?.data?.error || `An unknown error occurred on ${platform}.`;
          console.error(`Update failed for ${platform}:`, reason);
          newErrors[platform] = errorMessage;
        }
      });

      setError(newErrors);

      if (!hasFailures) {
        setNotification('Stream(s) updated successfully!');
        fetchAllStreamInfo(); // Refresh data on full success
      }
    } catch (err) {
      console.error('Error during the update submission process:', err);
      setError({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const errorMessages = Object.entries(error)
    .map(([platform, message]) => {
      if (platform === 'general') return message;
      return `${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${message}`;
    })
    .join('\n');

  return (
    <>
      <header className="dashboard-header">
        <h2>Multi-Stream Updater</h2>
        <div className="header-right-section">
          <div className="connected-platforms">
            <div className={`platform-status ${twitchAuth ? 'connected' : ''}`}>
              <TwitchIcon className="platform-icon-status" />
              {twitchAuth ? (
                <span>{twitchAuth.userName}</span>
              ) : (
                <button type="button" onClick={handleTwitchConnect} className="connect-btn twitch">Connect</button>
              )}
              {isRefreshing.twitch && <Spinner />}
            </div>
            <div className={`platform-status ${youtubeAuth ? 'connected' : ''}`}>
              <YouTubeIcon className="platform-icon-status" />
              {youtubeAuth ? (
                <span>{youtubeAuth.userName || 'YouTube'}</span>
              ) : (
                <button type="button" onClick={handleYouTubeConnect} className="connect-btn youtube">Connect</button>
              )}
              {isRefreshing.youtube && <Spinner />}
            </div>
            <div className={`platform-status ${kickAuth ? 'connected' : ''}`}>
              <KickIcon className="platform-icon-status" />
              {kickAuth ? (
                <span>{kickAuth.userName}</span>
              ) : (
                <button type="button" onClick={handleKickConnect} className="connect-btn kick">Connect</button>
              )}
              {isRefreshing.kick && <Spinner />}
            </div>
          </div>
          <UserMenu auth={auth} onLogout={onLogout} onIndividualLogout={onIndividualLogout} />
        </div>
      </header>

      <main>
        <p className="welcome-message">Welcome, {twitchAuth?.userName || youtubeAuth?.userName || kickAuth?.userName || 'Streamer'}!</p>

        <form id="stream-update-form" onSubmit={handleSubmit} className="dashboard-form">
          <div className="stream-editor-layout">
            <PlatformCard title="Shared Information" className="shared-card">
              <div className="form-group">
                <label htmlFor="title">Stream Title</label>
                <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your stream title..." disabled={!twitchAuth && !youtubeAuth && !kickAuth} />
              </div>
            </PlatformCard>

            {twitchAuth && (
              <PlatformCard title="Twitch Settings" className="twitch-card">
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
            )}

            {youtubeAuth && (
              <PlatformCard title="YouTube Settings" className="youtube-card">
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
            )}

            {kickAuth && (
              <PlatformCard title="Kick Settings" className="kick-card">
                <div className="form-group">
                  <label htmlFor="kickCategory">Category</label>
                  <input
                    id="kickCategory"
                    type="text"
                    value={kickCategory}
                    onChange={(e) => setKickCategory(e.target.value)}
                    placeholder="Enter a category..."
                    disabled={!kickAuth}
                  />
                  <small>Note: Kick's API currently requires manual category entry.</small>
                </div>
              </PlatformCard>
            )}
          </div>
        </form>

        <div className="form-actions">
          <button type="submit" form="stream-update-form" disabled={isLoading || (!twitchAuth && !youtubeAuth && !kickAuth)}>{isLoading ? 'Updating...' : 'Update All Streams'}</button>
          <button type="button" onClick={fetchAllStreamInfo} disabled={isLoading} className="secondary-action">Refresh All Info</button>
        </div>
      </main>
      
      {notification && <div className="notification success">{notification}</div>}
      {errorMessages && <div className="notification error">{errorMessages}</div>}
    </>
  );
}

export default Dashboard;
