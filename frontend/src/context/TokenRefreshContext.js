import React, { createContext, useState, useContext, useEffect } from 'react';

const TokenRefreshContext = createContext();

export const useTokenRefresh = () => useContext(TokenRefreshContext);

export const TokenRefreshProvider = ({ children }) => {
  const [isRefreshing, setIsRefreshing] = useState({
    twitch: false,
    youtube: false,
  });

  useEffect(() => {
    const handleRefreshStart = (event) => {
      const { platform } = event.detail;
      if (platform) {
        setIsRefreshing(prev => ({ ...prev, [platform]: true }));
      }
    };

    const handleRefreshEnd = (event) => {
      const { platform } = event.detail;
      if (platform) {
        setIsRefreshing(prev => ({ ...prev, [platform]: false }));
      }
    };

    window.addEventListener('tokenRefreshStart', handleRefreshStart);
    window.addEventListener('tokenRefreshEnd', handleRefreshEnd);

    return () => {
      window.removeEventListener('tokenRefreshStart', handleRefreshStart);
      window.removeEventListener('tokenRefreshEnd', handleRefreshEnd);
    };
  }, []);

  return (
    <TokenRefreshContext.Provider value={{ isRefreshing }}>
      {children}
    </TokenRefreshContext.Provider>
  );
};
