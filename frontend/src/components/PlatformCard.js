import React from 'react';
import './PlatformCard.css';

const PlatformCard = ({ title, children, className, isConnected = true }) => {
  return (
    <div className={`platform-card ${className || ''} ${!isConnected ? 'disconnected' : ''}`}>
      <div className="platform-card-header">
        <h3>{title}</h3>
      </div>
      <div className="platform-card-content">
        {children}
      </div>
    </div>
  );
};

export default PlatformCard;
