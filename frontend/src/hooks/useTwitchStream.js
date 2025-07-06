import { useState, useEffect, useCallback } from 'react';
import api from '../api';

export const useTwitchStream = (twitchAuth, setTitle, setError) => {
  const [twitchCategory, setTwitchCategory] = useState('');
  const [twitchCategoryQuery, setTwitchCategoryQuery] = useState('');
  const [twitchCategoryResults, setTwitchCategoryResults] = useState([]);
  const [isTwitchCategoryLoading, setIsTwitchCategoryLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  const fetchTwitchStreamInfo = useCallback(async () => {
    if (!twitchAuth) return;
    try {
      const response = await api.get(`/api/twitch?action=stream_info`, {
        params: { broadcaster_id: twitchAuth.userId },
        headers: { 'Authorization': `Bearer ${twitchAuth.token}` },
      });
      setTitle(currentTitle => currentTitle || response.data.title || '');
      setTwitchCategory(response.data.game_name || '');
      setTags(response.data.tags || []);
    } catch (err) {
      console.error('Could not fetch Twitch info:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch Twitch info.';
      setError(prev => ({ ...prev, twitch: errorMessage }));
    }
  }, [twitchAuth, setTitle, setError]);

  const searchTwitchCategories = useCallback(async (query) => {
    if (!query) {
      setTwitchCategoryResults([]);
      return;
    }
    setIsTwitchCategoryLoading(true);
    try {
      const response = await api.get(`/api/twitch?action=categories&query=${query}`);
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

  return {
    twitchCategory,
    setTwitchCategory,
    twitchCategoryQuery,
    setTwitchCategoryQuery,
    twitchCategoryResults,
    setTwitchCategoryResults,
    isTwitchCategoryLoading,
    tags,
    tagInput,
    handleTagInputChange,
    handleTagInputKeyDown,
    removeTag,
    fetchTwitchStreamInfo,
  };
};
