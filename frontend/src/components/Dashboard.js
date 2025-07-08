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
import ThemeToggleButton from './ThemeToggleButton';
import CategorySearch from './CategorySearch';
import TagInput from './TagInput';
import UserMenu from './UserMenu';

function Dashboard({ auth, onLogout, onIndividualLogout, setAuth }) {
  // Shared state
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // For the main update button
  const [error, setError] = useState({}); // Use an object for platform-specific errors
  const [notification, setNotification] = useState('');

  // Get auth details from the prop
  const { twitch: twitchAuth, youtube: youtubeAuth, kick: kickAuth } = auth;

  // --- Custom Hooks for Platform Logic ---
  const {
    twitchCategory, setTwitchCategory, twitchCategoryQuery, setTwitchCategoryQuery, // Assuming the hook provides isLoading
    twitchCategoryResults, setTwitchCategoryResults, isTwitchCategoryLoading,
    tags, tagInput, handleTagInputChange, handleTagInputKeyDown, removeTag, tagSuggestions, addTag, isLoading: isTwitchLoading,
    fetchTwitchStreamInfo
  } = useTwitchStream(twitchAuth, setTitle, setError);

  const {
    description, setDescription, youtubeStreamId, youtubeUpdateType,
    youtubeCategoryId, setYoutubeCategoryId, youtubeCategories, isLoading: isYouTubeLoading,
    fetchYouTubeStreamInfo
  } = useYouTubeStream(youtubeAuth, setTitle, setError);

  const {
    kickCategory,
    setKickCategory,
    kickCategoryQuery, setKickCategoryQuery,
    kickCategoryResults, setKickCategoryResults,
    isKickCategoryLoading, isLoading: isKickLoading,
    fetchKickStreamInfo
  } = useKickStream(kickAuth, setTitle, setError);

  // Get token refreshing state from context
  const { isRefreshing } = useTokenRefresh();

  // This function now just coordinates the fetches. The hooks manage their own loading state.
  const fetchAllStreamInfo = useCallback(async () => {
    setError({}); // Clear previous errors
    // The fetch functions from the hooks should set their own loading states internally.
    await Promise.allSettled([
      fetchTwitchStreamInfo(),
      fetchYouTubeStreamInfo(),
      fetchKickStreamInfo()
    ]);
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

  const handleConnect = (platform) => {
    const authUrl = `${api.defaults.baseURL}/api/auth/${platform}/connect`;
    const width = 500, height = 650;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    const windowFeatures = `width=${width},height=${height},top=${top},left=${left}`;
    window.open(authUrl, `${platform}Auth`, windowFeatures);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError({}); // Clear previous errors
    setNotification('');

    const updateOperations = [];
    
    const platformUpdateConfig = [
      {
        platform: 'twitch',
        isReady: !!twitchAuth,
        getPayload: () => ({
          title,
          category: twitchCategory,
          tag_ids: tags.map(tag => tag.tag_id), // Send an array of tag IDs
          broadcasterId: twitchAuth.userId
        }),
        getToken: () => twitchAuth.token,
      },
      {
        platform: 'youtube',
        isReady: !!youtubeAuth && !!youtubeStreamId,
        getPayload: () => ({ title, description, streamId: youtubeStreamId, updateType: youtubeUpdateType, categoryId: youtubeCategoryId }),
        getToken: () => youtubeAuth.token,
      },
      {
        platform: 'kick',
        isReady: !!kickAuth,
        getPayload: () => ({ channel: kickAuth.userName, title, category: kickCategory }),
        getToken: () => kickAuth.token,
      },
    ];

    platformUpdateConfig.forEach(p => {
      if (p.isReady) {
        updateOperations.push({
          platform: p.platform,
          promise: api.post(`/api/${p.platform}?action=stream_update`, p.getPayload(), {
            headers: { 'Authorization': `Bearer ${p.getToken()}` }
          })
        });
      }
    });

    if (updateOperations.length === 0) {
      setError({ general: "No platforms connected to update." });
      setIsSubmitting(false);
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
      setIsSubmitting(false);
    }
  };

  const platforms = [
    { key: 'twitch', name: 'Twitch', auth: twitchAuth, Icon: TwitchIcon, isRefreshing: isRefreshing.twitch },
    { key: 'youtube', name: 'YouTube', auth: youtubeAuth, Icon: YouTubeIcon, isRefreshing: isRefreshing.youtube },
    { key: 'kick', name: 'Kick', auth: kickAuth, Icon: KickIcon, isRefreshing: isRefreshing.kick },
  ];

  // To avoid duplicating code, we'll define the platform status block once.
  const platformStatusBlock = (
    <>
      {platforms.map(({ key, name, auth, Icon, isRefreshing }) => (
        <div key={key} className={`platform-status ${auth ? 'connected' : ''}`}>
          <Icon className="platform-icon-status" />
          {auth ? (
            <span>{auth.userName || name}</span>
          ) : (
            <button type="button" onClick={() => handleConnect(key)} className={`connect-btn ${key}`}>Connect</button>
          )}
          {isRefreshing && <Spinner />}
        </div>
      ))}
    </>
  );

  return (
    <div className="dashboard-layout-container">
      <header className="dashboard-header">
        <h2>Multi-Stream Updater</h2>
        <div className="header-right-section">
          <div className="connected-platforms connected-platforms-desktop">
            {platformStatusBlock}
          </div>
          <ThemeToggleButton />
          <UserMenu auth={auth} onLogout={onLogout} onIndividualLogout={onIndividualLogout} />
        </div>
      </header>

      <main>
        <p className="welcome-message">Welcome, {twitchAuth?.userName || youtubeAuth?.userName || kickAuth?.userName || 'Streamer'}!</p>

        <div className="connected-platforms connected-platforms-mobile">
          {platformStatusBlock}
        </div>

        <form id="stream-update-form" onSubmit={handleSubmit} className="dashboard-form">
          <div className="stream-editor-layout">
            <PlatformCard title="Shared Information" className="shared-card">
              <div className="form-group">
                <label htmlFor="title">Stream Title</label>
                <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your stream title..." disabled={!twitchAuth && !youtubeAuth && !kickAuth} />
              </div>
            </PlatformCard>

            {twitchAuth && (
              <PlatformCard title="Twitch Settings" className="twitch-card" error={error.twitch} isLoading={isTwitchLoading}>
                <div className="form-group">
                  <label htmlFor="twitchCategory">Category</label>
                  <CategorySearch
                    value={twitchCategoryQuery || twitchCategory}
                    onChange={(e) => {
                      setTwitchCategory(''); // Clear selection when user types
                      setTwitchCategoryQuery(e.target.value);
                    }}
                    placeholder="Search for a category..."
                    disabled={!twitchAuth}
                    results={twitchCategoryResults}
                    onSelect={(cat) => {
                      setTwitchCategory(cat.name);
                      setTwitchCategoryQuery('');
                      setTwitchCategoryResults([]);
                    }}
                    isLoading={isTwitchCategoryLoading}
                    renderResultItem={(cat) => (
                      <>
                        <img src={cat.box_art_url.replace('{width}', '30').replace('{height}', '40')} alt="" />
                        <span>{cat.name}</span>
                      </>
                    )}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tags">Tags (up to 10)</label>
                  <TagInput
                    tags={tags}
                    tagInput={tagInput}
                    onTagInputChange={handleTagInputChange}
                    onTagInputKeyDown={handleTagInputKeyDown}
                    onRemoveTag={removeTag}
                    suggestions={tagSuggestions}
                    onAddTag={addTag}
                    disabled={!twitchAuth}
                  />
                </div>
              </PlatformCard>
            )}

            {youtubeAuth && (
              <PlatformCard title="YouTube Settings" className="youtube-card" error={error.youtube} isLoading={isYouTubeLoading}>
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
              <PlatformCard title="Kick Settings" className="kick-card" error={error.kick} isLoading={isKickLoading}>
                <div className="form-group">
                  <label htmlFor="kickCategory">Category</label>
                  <CategorySearch
                    value={kickCategoryQuery || kickCategory}
                    onChange={(e) => {
                      setKickCategory(''); // Clear selection when user types
                      setKickCategoryQuery(e.target.value);
                    }}
                    placeholder="Search for a category..."
                    disabled={!kickAuth}
                    results={kickCategoryResults}
                    onSelect={(cat) => {
                      setKickCategory(cat.name);
                      setKickCategoryQuery('');
                      setKickCategoryResults([]);
                    }}
                    isLoading={isKickCategoryLoading}
                    renderResultItem={(cat) => (
                      <>
                        <img src={cat.thumbnail} alt={cat.name} />
                        <span>{cat.name}</span>
                      </>
                    )}
                  />
                </div>
              </PlatformCard>
            )}
          </div>
        </form>
      </main>
      
      <div className="form-actions">
        <button type="submit" form="stream-update-form" disabled={isSubmitting || (!twitchAuth && !youtubeAuth && !kickAuth)}>{isSubmitting ? 'Updating...' : 'Update All Streams'}</button>
        <button type="button" onClick={fetchAllStreamInfo} disabled={isSubmitting || isTwitchLoading || isYouTubeLoading || isKickLoading} className="secondary-action">
          {(isTwitchLoading || isYouTubeLoading || isKickLoading) ? 'Refreshing...' : 'Refresh All Info'}
        </button>
      </div>

      {notification && <div className="notification success">{notification}</div>}
      {error.general && <div className="notification error">{error.general}</div>}
    </div>
  );
}

export default Dashboard;
