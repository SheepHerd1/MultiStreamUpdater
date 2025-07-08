import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useDebounce } from './useDebounce';

export const useTwitchStream = (twitchAuth, setTitle, setError) => {
  const [isLoading, setIsLoading] = useState(false);
  const [twitchCategory, setTwitchCategory] = useState('');
  const [twitchCategoryQuery, setTwitchCategoryQuery] = useState('');
  const [twitchCategoryResults, setTwitchCategoryResults] = useState([]);
  const [isTwitchCategoryLoading, setIsTwitchCategoryLoading] = useState(false);
  const [tags, setTags] = useState([]); // Will hold tag objects { tag_id, localization_names }
  const [tagInput, setTagInput] = useState('');
  const [isTagSearchLoading, setIsTagSearchLoading] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState([]);

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
      }

      // Fetch the stream's current tags using the new endpoint
      const currentTagsResponse = await api.get('/api/twitch?action=stream_tags', {
        params: { broadcaster_id: twitchAuth.userId },
        headers: { 'Authorization': `Bearer ${twitchAuth.token}` },
      });
      setTags(currentTagsResponse.data || []);

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


  // Search for tag suggestions as the user types
  useEffect(() => {
    if (!debouncedTagQuery) {
      setTagSuggestions([]);
      return;
    }

    const controller = new AbortController();

    const searchTags = async () => {
      setIsTagSearchLoading(true);
      try {
        const response = await api.get(`/api/twitch?action=search_tags&query=${debouncedTagQuery}`, {
          signal: controller.signal,
        });
        const existingTagIds = new Set(tags.map(t => t.tag_id));
        const filtered = response.data.filter(tag => !existingTagIds.has(tag.tag_id));
        setTagSuggestions(filtered);
      } catch (error) {
        if (error.name !== 'CanceledError') {
          console.error('Error searching for tags:', error);
          setTagSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsTagSearchLoading(false);
        }
      }
    };
    searchTags();

    return () => controller.abort();
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

  // This function now adds a tag *object* from the suggestions
  const addTag = (tagObject) => {
    if (tags.length < 10 && !tags.some(t => t.tag_id === tagObject.tag_id)) {
      setTags([...tags, tagObject]);
      setTagInput('');
      setTagSuggestions([]); // Clear suggestions after adding one
    }
  };

  const handleTagInputKeyDown = (e) => {
    // We only add tags from suggestions, so Enter key might be used for that later.
    // For now, we just handle backspace to remove the last tag.
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      e.preventDefault();
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove) => setTags(tags.filter(tag => tag.tag_id !== tagToRemove.tag_id));

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
    isTagSearchLoading,
    handleTagInputChange,
    handleTagInputKeyDown,
    tagSuggestions,
    addTag,
    removeTag,
    fetchTwitchStreamInfo,
  };
};
