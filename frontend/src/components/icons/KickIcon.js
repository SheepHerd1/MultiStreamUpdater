import React from 'react';

const KickIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
  >
    <title>Kick</title>
    
    {/* The hard shadow layer, drawn first and offset by (1, 1) */}
    <path
      fillRule="evenodd"
      d="M7 3h12c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z M9 5h3v6.5l5-6.5h3L13.5 12l6.5 8h-3l-5-6.5V21H9V5z"
      fill="rgba(0,0,0,0.25)"
    />
    
    {/* The main shape, with a new, bolder K path */}
    <path
      fillRule="evenodd"
      d="M6 2h12c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2z M8 4h3v6.5l5-6.5h3L12.5 12l6.5 8h-3l-5-6.5V20H8V4z"
      fill="currentColor"
    />
  </svg>
);

export default KickIcon;
