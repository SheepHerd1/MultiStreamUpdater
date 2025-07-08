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

  // Fetch the master list of all Twitch tags once on component mount
  useEffect(() => {
    const fetchMasterTagList = async () => {
      if (twitchAuth && allTwitchTags.length === 0) {
        try {
          const response = await api.get('/api/twitch?action=all_tags');
          setAllTwitchTags(response.data || []);
        } catch (error) {
          console.error("Failed to fetch all Twitch tags:", error);
          const errorMessage = error.response?.data?.error || 'Failed to fetch Twitch tags.';
          setError(prev => ({ ...prev, twitch: errorMessage }));
        }
      }
    };
    fetchMasterTagList();
  }, [twitchAuth, allTwitchTags.length, setError]);


  const fetchTwitchStreamInfo = useCallback(async () => {
    if (!twitchAuth) return;
    // Wait until the master tag list is fetched before getting stream info
    if (allTwitchTags.length === 0) return; 

    setIsLoading(true);
    try {
      const response = await api.get(`/api/twitch?action=stream_info`, {
        params: { broadcaster_id: twitchAuth.userId },
        headers: { 'Authorization': `Bearer ${twitchAuth.token}` },
      });
      setTitle(currentTitle => currentTitle || response.data.title || '');
      setTwitchCategory(response.data.game_name || '');

      // The API returns tag names (strings). We need to find their corresponding full objects.
      const currentTagNames = response.data.tags || [];
      const currentTagObjects = currentTagNames
        .map(name => allTwitchTags.find(t => t.localization_names['en-us'] === name))
        .filter(Boolean); // Filter out any tags not found in the master list
      setTags(currentTagObjects);

    } catch (err) {
      console.error('Could not fetch Twitch info:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch Twitch info.';
      setError(prev => ({ ...prev, twitch: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  }, [twitchAuth, setTitle, setError, allTwitchTags]);

  // This useEffect depends on allTwitchTags being populated.
  useEffect(() => {
    if (allTwitchTags.length > 0) {
        fetchTwitchStreamInfo();
    }
  }, [allTwitchTags, fetchTwitchStreamInfo]);


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
