import { useState, useCallback } from 'react';
import api from '../api';

export const useKickStream = (kickAuth, setTitle, setError) => {
  const [kickCategory, setKickCategory] = useState('');
  // Kick API might not have a separate category search, so we'll handle it differently for now.

  const fetchKickStreamInfo = useCallback(async () => {
    if (!kickAuth) return;
    try {
      // We pass the username (which is the channel slug) to the backend.
      const response = await api.get(`/api/kick/stream/info`, {
        params: { channel: kickAuth.userName },
        headers: { 'Authorization': `Bearer ${kickAuth.token}` }, // Pass token for auth context
      });
      
      if (response.data) {
        setTitle(currentTitle => currentTitle || response.data.session_title || '');
        setKickCategory(response.data.category?.name || '');
      }
    } catch (err) {
      console.error('Could not fetch Kick info:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch Kick info.';
      setError(prev => ({ ...prev, kick: errorMessage }));
    }
  }, [kickAuth, setTitle, setError]);

  return {
    kickCategory,
    setKickCategory,
    fetchKickStreamInfo,
  };
};