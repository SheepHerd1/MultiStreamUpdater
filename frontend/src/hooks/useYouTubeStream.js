import { useState, useEffect, useCallback } from 'react';
import api from '../api';

export const useYouTubeStream = (youtubeAuth, setTitle, setError) => {
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [youtubeStreamId, setYoutubeStreamId] = useState(null);
  const [youtubeUpdateType, setYoutubeUpdateType] = useState(null);
  const [youtubeCategoryId, setYoutubeCategoryId] = useState('');
  const [youtubeCategories, setYoutubeCategories] = useState([]);

  const fetchYouTubeStreamInfo = useCallback(async () => {
    if (!youtubeAuth) return;
    setIsLoading(true);
    try {
      const response = await api.get(`/api/youtube?action=stream_info`, {
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
      setError(prev => ({ ...prev, youtube: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  }, [youtubeAuth, setTitle, setError]);

  useEffect(() => {
    const fetchYoutubeCategories = async () => {
      if (!youtubeAuth) return;
      try {
        const response = await api.get('/api/youtube?action=categories');
        const assignableCategories = response.data.filter(cat => cat.snippet?.assignable);
        setYoutubeCategories(assignableCategories);
      } catch (error) {
        console.error("Could not fetch YouTube categories", error);
      }
    };
    fetchYoutubeCategories();
  }, [youtubeAuth]);

  return {
    isLoading,
    description,
    setDescription,
    youtubeStreamId,
    youtubeUpdateType,
    youtubeCategoryId,
    setYoutubeCategoryId,
    youtubeCategories,
    fetchYouTubeStreamInfo,
  };
};
