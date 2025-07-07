import React from 'react';

const KickIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
  >
    <title>Kick</title>
    {/* The hard shadow layer, drawn first and offset slightly */}
    <path 
      d="M7 22V4h2v7l5-7h2l-6 8 6 8h-2l-5-7v7H7z" 
      fill="rgba(0,0,0,0.2)" 
    />
    {/* The main letter, drawn on top of the shadow */}
    <path 
      d="M6 21V3h2v7l5-7h2l-6 8 6 8h-2l-5-7v7H6z" 
      fill="currentColor" 
    />
  </svg>
);

export default KickIcon;
