import React from 'react';

const KickIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
  >
    <title>Kick</title>
    <defs>
      <filter id="kick-logo-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.3" />
      </filter>
    </defs>
    <text
      x="50%"
      y="50%"
      dy=".3em" /* Vertical alignment adjustment */
      textAnchor="middle"
      fontSize="20"
      fontWeight="bold"
      fontFamily="system-ui, sans-serif"
      fill="currentColor"
      filter="url(#kick-logo-shadow)"
    >
      K
    </text>
  </svg>
);

export default KickIcon;
