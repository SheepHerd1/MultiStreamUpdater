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
  const [allTwitchTags, setAllTwitchTags] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);

  const debouncedTwitchQuery = useDebounce(twitchCategoryQuery, 300);

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

  // Fetch all available Twitch tags once for searching
  useEffect(() => {
    const fetchAllTags = async () => {
      if (twitchAuth && allTwitchTags.length === 0) {
        try {
          const response = await api.get('/api/twitch?action=all_tags');
          // We only need the localized names for simplicity
          const tagData = response.data.map(tag => ({
            id: tag.tag_id,
            name: tag.localization_names['en-us']
          }));
          setAllTwitchTags(tagData);
        } catch (error) {
          console.error("Failed to fetch all Twitch tags:", error);
          // This now correctly handles both network errors and errors thrown by the server.
          const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred.';
          setError(prev => ({ ...prev, twitch: `Tag search failed: ${errorMessage}` }));
        }
      }
    };
    fetchAllTags();
  }, [twitchAuth, allTwitchTags.length]);

  // Update suggestions when user types in the tag input
  useEffect(() => {
    if (tagInput && allTwitchTags.length > 0) {
      const filtered = allTwitchTags
        .filter(tag => tag.name.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(tag.name))
        .slice(0, 5); // Limit to 5 suggestions for performance and UI clarity
      setTagSuggestions(filtered);
    } else {
      setTagSuggestions([]);
    }
  }, [tagInput, allTwitchTags, tags]);

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
