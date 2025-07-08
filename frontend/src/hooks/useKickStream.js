import { useState, useCallback, useEffect } from 'react';
import api from '../api';
import { useDebounce } from './useDebounce';

export const useKickStream = (kickAuth, setTitle, setError) => {
  const [isLoading, setIsLoading] = useState(false);
  const [kickCategory, setKickCategory] = useState('');
  const [kickCategoryQuery, setKickCategoryQuery] = useState('');
  const [kickCategoryResults, setKickCategoryResults] = useState([]);
  const [isKickCategoryLoading, setIsKickCategoryLoading] = useState(false);

  const debouncedKickQuery = useDebounce(kickCategoryQuery, 500);

  const fetchKickStreamInfo = useCallback(async () => {
    // We only need the token to start. The username might not be available in the
    // auth object immediately after login, so we'll fetch it first.
    if (!kickAuth?.token) return;
    setIsLoading(true);
    try {
      // Step 1: Fetch user info to get the channel name (which is the 'slug').
      const userInfoResponse = await api.get(`/api/kick?action=user_info`, {
        headers: { 'Authorization': `Bearer ${kickAuth.token}` },
      });

      // The user object from Kick should contain a 'slug' which is the channel name.
      // We'll also check for 'username' as a fallback and log the object for debugging.
      const userData = userInfoResponse.data;

      const channelName = userData?.slug || userData?.username;
      if (!channelName) {
        // Throw a more informative error if we can't find the channel name.
        throw new Error('Could not determine Kick channel name from user info object. Check the console log above for details.');
      }

      // Step 2: Use the retrieved channel name to fetch the stream info.
      const streamInfoResponse = await api.get(`/api/kick?action=stream_info`, {
        params: { channel: channelName },
        headers: { 'Authorization': `Bearer ${kickAuth.token}` },
      });

      if (streamInfoResponse.data) {
        setTitle(currentTitle => currentTitle || streamInfoResponse.data.session_title || '');
        setKickCategory(streamInfoResponse.data.category?.name || '');
      }
    } catch (err) {
      console.error('Could not fetch Kick info:', err);
      const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred while fetching Kick info.';
      setError(prev => ({ ...prev, kick: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  }, [kickAuth?.token, setTitle, setError]);

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
