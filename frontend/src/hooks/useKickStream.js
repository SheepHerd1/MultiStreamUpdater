import { useState, useCallback } from 'react';
import api from '../api';

export const useKickStream = (kickAuth, setTitle, setError) => {
  const [kickCategory, setKickCategory] = useState('');
  // Kick API might not have a separate category search, so we'll handle it differently for now.

  const fetchKickStreamInfo = useCallback(async () => {
    // We only need the token to start. The username might not be available in the
    // auth object immediately after login, so we'll fetch it first.
    if (!kickAuth?.token) return;

    try {
      // Step 1: Fetch user info to get the channel name (which is the 'slug').
      const userInfoResponse = await api.get(`/api/kick?action=user_info`, {
        headers: { 'Authorization': `Bearer ${kickAuth.token}` },
      });

      const channelName = userInfoResponse.data?.slug;
      if (!channelName) {
        throw new Error('Could not determine Kick channel name from user info.');
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
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch Kick info.';
      setError(prev => ({ ...prev, kick: errorMessage }));
    }
  }, [kickAuth?.token, setTitle, setError]);

  return {
    kickCategory,
    setKickCategory,
    fetchKickStreamInfo,
  };
};
