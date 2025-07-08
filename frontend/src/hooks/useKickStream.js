import { useState, useCallback, useEffect } from 'react';
import api from '../api';
import { useDebounce } from './useDebounce';

export const useKickStream = (kickAuth, setTitle, setError) => {
  const [isLoading, setIsLoading] = useState(false);
  // Store the entire category object { id, name, ... } or null
  const [kickCategory, setKickCategory] = useState(null);
  const [kickCategoryQuery, setKickCategoryQuery] = useState('');
  const [kickCategoryResults, setKickCategoryResults] = useState([]);
  const [isKickCategoryLoading, setIsKickCategoryLoading] = useState(false);

  const debouncedKickQuery = useDebounce(kickCategoryQuery, 500);

  const fetchKickStreamInfo = useCallback(async () => {
    // We only need the token to start. The username might not be available in the
    // auth object, so we check for both.
    if (!kickAuth?.token || !kickAuth?.userName) return;
    setIsLoading(true);
    try {
      // We already have the channel name from the auth object, so we can use it directly.
      const channelName = kickAuth.userName;

      // Use the channel name to fetch the stream info.
      const streamInfoResponse = await api.get(`/api/kick?action=stream_info`, {
        params: { channel: channelName },
        headers: { 'Authorization': `Bearer ${kickAuth.token}` },
      });

      if (streamInfoResponse.data) {
        // The official Kick v1 API returns the stream title and category at the top level of the channel object.
        const channelData = streamInfoResponse.data;
        setTitle(currentTitle => currentTitle || channelData.stream_title || '');
        // The category is a single object, not an array.
        setKickCategory(channelData.category || null);
      }
    } catch (err) {
      console.error('Could not fetch Kick info:', err);
      const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred while fetching Kick info.';
      setError(prev => ({ ...prev, kick: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  }, [kickAuth, setTitle, setError]);

  useEffect(() => {
    if (debouncedKickQuery) {
      const searchKickCategories = async () => {
        if (!kickAuth?.token) return;
        setIsKickCategoryLoading(true);
        try {
          // This proxies the request through our backend to the Kick API
          const response = await api.get(`/api/kick?action=search_categories`, {
            params: { q: debouncedKickQuery },
            headers: { 'Authorization': `Bearer ${kickAuth.token}` },
          });
          // Based on Kick docs, results are in a 'data' array
          setKickCategoryResults(response.data?.data || []);
        } catch (err) {
          console.error('Failed to search Kick categories:', err);
          setKickCategoryResults([]); // Clear results on error
        } finally {
          setIsKickCategoryLoading(false);
        }
      };
      searchKickCategories();
    } else {
      setKickCategoryResults([]); // Clear results if query is empty
    }
  }, [debouncedKickQuery, kickAuth?.token]);

  return {
    isLoading,
    kickCategory,
    setKickCategory,
    kickCategoryQuery, setKickCategoryQuery,
    kickCategoryResults, setKickCategoryResults,
    isKickCategoryLoading,
    fetchKickStreamInfo,
  };
};
