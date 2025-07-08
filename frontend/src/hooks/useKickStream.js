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
    // We need the token for auth and the userName to derive the slug for the v2 endpoint.
    if (!kickAuth?.token || !kickAuth?.userName) return;
    setIsLoading(true);
    try {
      // Pass the channel slug to the backend to query the v2 endpoint.
      const streamInfoResponse = await api.get(`/api/kick?action=stream_info`, {
        params: { channel_slug: kickAuth.userName.toLowerCase() },
        headers: { 'Authorization': `Bearer ${kickAuth.token}` },
      });

      if (streamInfoResponse.data) {
        // This is a robust parser that can handle both v1 and v2 API responses.
        const { title, category, isLive } = parseKickApiResponse(streamInfoResponse.data);
        setTitle(currentTitle => currentTitle || title || '');

        // Clear any previous Kick-specific error/info message before processing new data.
        setError(prev => {
            const { kick, ...rest } = prev;
            return rest;
        });

        // Check if the category data is valid or just a placeholder for an offline stream.
        if (category && category.id !== 0 && category.name) {
          setKickCategory(category);
        } else {
          setKickCategory(null);
          // If the stream is offline, provide a helpful message to the user.
          if (!isLive) {
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

  // This helper function can parse data from either the v1 or v2 Kick API endpoints,
  // making the frontend resilient to backend changes.
  const parseKickApiResponse = (data) => {
    // Check for v2 structure (undocumented)
    if (data && data.livestream) {
      return {
        title: data.livestream.session_title,
        category: data.livestream.categories?.[0], // v2 has an array of categories
        isLive: data.livestream.is_live,
      };
    }
    // Fallback to v1 structure (official)
    if (data) {
      return {
        title: data.stream_title,
        category: data.category,
        isLive: data.stream?.is_live,
      };
    }
    return {}; // Return empty object if data is invalid
  };

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
