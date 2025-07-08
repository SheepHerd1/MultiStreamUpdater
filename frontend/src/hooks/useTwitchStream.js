import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useDebounce } from './useDebounce';

export const useTwitchStream = (twitchAuth, setTitle, setError) => {
  const [isLoading, setIsLoading] = useState(false);
  const [twitchCategory, setTwitchCategory] = useState('');
  const [twitchCategoryQuery, setTwitchCategoryQuery] = useState('');
  const [twitchCategoryResults, setTwitchCategoryResults] = useState([]);
  const [isTwitchCategoryLoading, setIsTwitchCategoryLoading] = useState(false);
  const [tags, setTags] = useState([]); // Will now hold an array of strings
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [isTagSearchLoading, setIsTagSearchLoading] = useState(false);

  const debouncedTwitchQuery = useDebounce(twitchCategoryQuery, 300);
  const debouncedTagQuery = useDebounce(tagInput, 300);

  const fetchTwitchStreamInfo = useCallback(async () => {
    if (!twitchAuth) return;
    
    setIsLoading(true);
    try {
      // Fetch stream info (title, category)
      const streamInfoResponse = await api.get(`/api/twitch?action=stream_info`, {
        params: { broadcaster_id: twitchAuth.userId },
        headers: { 'Authorization': `Bearer ${twitchAuth.token}` },
      });
      // Defensively check if data exists before trying to access its properties
      if (streamInfoResponse.data) {
        setTitle(currentTitle => currentTitle || streamInfoResponse.data.title || '');
        setTwitchCategory(streamInfoResponse.data.game_name || '');
        // The /channels endpoint returns tags as an array of strings
        setTags(streamInfoResponse.data.tags || []);
      }

    } catch (err) {
      console.error('Could not fetch Twitch info:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch Twitch info.';
      setError(prev => ({ ...prev, twitch: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  }, [twitchAuth, setTitle, setError]);

  useEffect(() => {
    if (twitchAuth) {
      fetchTwitchStreamInfo();
    }
  }, [twitchAuth, fetchTwitchStreamInfo]);

  // Effect for searching for tag suggestions
  useEffect(() => {
    if (!debouncedTagQuery) {
      setTagSuggestions([]);
      return;
    }

    const searchForTags = async () => {
      setIsTagSearchLoading(true);
      try {
        const response = await api.get(`/api/twitch?action=search_tags&query=${debouncedTagQuery}`);
        // The API returns tag objects, we just need their names (which are the tags themselves)
        const suggestedTagNames = response.data.map(tag => tag.name);
        // Filter out any tags that have already been added
        const filteredSuggestions = suggestedTagNames.filter(name => !tags.includes(name));
        setTagSuggestions(filteredSuggestions);
      } catch (error) {
        console.error('Error searching for tags:', error);
        setTagSuggestions([]);
      } finally {
        setIsTagSearchLoading(false);
      }
    };
    searchForTags();
  }, [debouncedTagQuery, tags]);

  // Handle category search
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

  // This function now adds a tag string from the input
  const addTag = (tagString) => {
    const newTag = tagString.trim();
    // Twitch tags cannot contain spaces. Let's enforce that.
    if (newTag && newTag.indexOf(' ') === -1 && tags.length < 10 && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setTagInput('');
      setTagSuggestions([]); // Clear suggestions after adding a tag
    }
  };

  const handleTagInputKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput) {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
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
    tagSuggestions,
    isTagSearchLoading,
    handleTagInputChange,
    handleTagInputKeyDown,
    addTag,
    removeTag,
    fetchTwitchStreamInfo,
  };
};
