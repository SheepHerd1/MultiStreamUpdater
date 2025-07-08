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
    // Reverting to use broadcaster_user_id for a more stable v1 API call.
    if (!kickAuth?.token || !kickAuth?.userId) return;
    setIsLoading(true);
    try {
      const streamInfoResponse = await api.get(`/api/kick?action=stream_info`, {
        params: { broadcaster_user_id: kickAuth.userId },
        headers: { 'Authorization': `Bearer ${kickAuth.token}` },
      });

      if (streamInfoResponse.data) {
        // The official Kick v1 API returns the stream title and category at the top level of the channel object.
        const channelData = streamInfoResponse.data;
        setTitle(currentTitle => currentTitle || channelData.stream_title || '');

        // Clear any previous Kick-specific error/info message before processing new data.
        setError(prev => {
            const { kick, ...rest } = prev;
            return rest;
        });

        // Check if the category data is valid or just a placeholder for an offline stream.
        if (channelData.category && channelData.category.id !== 0 && channelData.category.name) {
          setKickCategory(channelData.category);
        } else {
          setKickCategory(null);
          // If the stream is offline, provide a helpful message to the user.
          if (channelData.stream && !channelData.stream.is_live) {
            setError(prev => ({ ...prev, kick: 'Category info is only available when the stream is live.' }));
          }
        }
      }
    } catch (err) {
      console.error('Could not fetch Kick info:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'An unknown error occurred while fetching Kick info.';
      setError(prev => ({ ...prev, kick: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  }, [kickAuth, setTitle, setError]);

  // This useEffect ensures that when the kickAuth object becomes available
  // (e.g., after login), the stream info is fetched automatically. This makes it
  // consistent with how the other platform hooks work.
  useEffect(() => {
    if (kickAuth) {
      fetchKickStreamInfo();
    }
  }, [kickAuth, fetchKickStreamInfo]);

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
