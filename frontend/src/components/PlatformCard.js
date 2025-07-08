import React from 'react';
import './PlatformCard.css';
import Spinner from './icons/Spinner';

const PlatformCard = ({ title, children, className, isConnected = true, error = null, isLoading = false }) => {
  return (
    <div className={`platform-card ${className || ''} ${!isConnected ? 'disconnected' : ''}`}>
      {isLoading && (
        <div className="platform-card-loader">
          <Spinner />
        </div>
      )}
      <div className="platform-card-header">
        <h3>{title}</h3>
      </div>
      <div className="platform-card-content">
        {children}
      </div>
      {error && (
        <div className="platform-card-error">{error}</div>
      )}
    </div>
  );
};

export default PlatformCard;
