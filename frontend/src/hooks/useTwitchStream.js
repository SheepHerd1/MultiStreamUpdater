import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useDebounce } from './useDebounce';

export const useTwitchStream = (twitchAuth, setTitle, setError) => {
  const [isLoading, setIsLoading] = useState(false);
  const [twitchCategory, setTwitchCategory] = useState('');
  const [twitchCategoryQuery, setTwitchCategoryQuery] = useState('');
  const [twitchCategoryResults, setTwitchCategoryResults] = useState([]);
  const [isTwitchCategoryLoading, setIsTwitchCategoryLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);

  const debouncedTwitchQuery = useDebounce(twitchCategoryQuery, 300);
  const debouncedTagQuery = useDebounce(tagInput, 300); // Debounce tag input

  const fetchTwitchStreamInfo = useCallback(async () => {
    if (!twitchAuth) return;
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [twitchAuth, setTitle, setError]);

  // Search for tags when the user types in the tag input
  useEffect(() => {
    if (debouncedTagQuery) {
      const searchTags = async () => {
        try {
          const response = await api.get(`/api/twitch?action=search_tags&query=${debouncedTagQuery}`); // Use the new action
          const suggestions = response.data
            .map(tag => ({ id: tag.id, name: tag.localization_names['en-us'] }))
            .filter(tag => !tags.includes(tag.name)); // Don't suggest tags that are already added
          setTagSuggestions(suggestions);
        } catch (error) {
          console.error("Failed to search for Twitch tags:", error);
          setTagSuggestions([]); // Clear suggestions on error
        }
      };
      searchTags();
    } else {
      setTagSuggestions([]); // Clear suggestions if input is empty
    }
  }, [debouncedTagQuery, tags]); // Rerun when debounced query or current tags change

  useEffect(() => {
    if (!debouncedTwitchQuery) {
      setTwitchCategoryResults([]);
      return;
    }

    const search = async () => {
      setIsTwitchCategoryLoading(true);
      try {
        const response = await api.get(`/api/twitch?action=categories&query=${debouncedTwitchQuery}`);
        setTwitchCategoryResults(response.data);
      } catch (error) {
        console.error('Error searching categories:', error);
        setTwitchCategoryResults([]);
      } finally {
        setIsTwitchCategoryLoading(false);
      }
    };

    search();
  }, [debouncedTwitchQuery]);

  const handleTagInputChange = (e) => setTagInput(e.target.value);

  const addTag = (tagToAdd) => {
    const newTag = tagToAdd.trim();
    if (newTag && !tags.includes(newTag) && tags.length < 10) {
      setTags([...tags, newTag]);
      setTagInput('');
    }
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput) {
      e.preventDefault();
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove) => setTags(tags.filter(tag => tag !== tagToRemove));

  return {
    isLoading,
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
    tagSuggestions,
    addTag,
    removeTag,
    fetchTwitchStreamInfo,
  };
};
