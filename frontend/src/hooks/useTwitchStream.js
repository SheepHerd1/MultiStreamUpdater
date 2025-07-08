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
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [allTwitchTags, setAllTwitchTags] = useState([]); // Master list of all available tags

  const debouncedTwitchQuery = useDebounce(twitchCategoryQuery, 300);

  // This is the function that will be called for initial load or manual refresh.
  // It's now stable and doesn't depend on changing state within its own dependency array.
  const fetchTwitchStreamInfo = useCallback(async () => {
    if (!twitchAuth) return;
    
    setIsLoading(true);
    try {
      // It's okay to fetch the master list again here if needed, as it's cached on the backend.
      const tagsResponse = await api.get('/api/twitch?action=all_tags');
      const masterTags = tagsResponse.data || [];
      setAllTwitchTags(masterTags);

      const streamInfoResponse = await api.get(`/api/twitch?action=stream_info`, {
        params: { broadcaster_id: twitchAuth.userId },
        headers: { 'Authorization': `Bearer ${twitchAuth.token}` },
      });

      setTitle(currentTitle => currentTitle || streamInfoResponse.data.title || '');
      setTwitchCategory(streamInfoResponse.data.game_name || '');

      const currentTagNames = streamInfoResponse.data.tags || [];
      const currentTagObjects = currentTagNames
        .map(name => masterTags.find(t => t.localization_names['en-us'] === name))
        .filter(Boolean);
      setTags(currentTagObjects);

    } catch (err) {
      console.error('Could not fetch Twitch info:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch Twitch info.';
      setError(prev => ({ ...prev, twitch: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  }, [twitchAuth, setTitle, setError]); // This is now stable as long as auth/setters don't change.

  // This single useEffect handles the initial data load for Twitch.
  // It runs only once when the twitchAuth object is first available.
  useEffect(() => {
    if (twitchAuth) {
      fetchTwitchStreamInfo();
    }
  }, [twitchAuth, fetchTwitchStreamInfo]);


  // Update tag suggestions when the user types
  useEffect(() => {
    if (tagInput) {
      const existingTagIds = new Set(tags.map(t => t.tag_id));
      const filtered = allTwitchTags
        .filter(tag => tag.localization_names['en-us'].toLowerCase().includes(tagInput.toLowerCase()))
        .filter(tag => !existingTagIds.has(tag.tag_id)) // Don't suggest already added tags
        .slice(0, 7); // Show a limited number of suggestions
      setTagSuggestions(filtered);
    } else {
      setTagSuggestions([]);
    }
  }, [tagInput, tags, allTwitchTags]);

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
    handleTagInputChange,
    handleTagInputKeyDown,
    tagSuggestions,
    addTag,
    removeTag,
    fetchTwitchStreamInfo,
  };
};
