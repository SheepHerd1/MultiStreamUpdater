import React from 'react';

const KickIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
  >
    <title>Kick</title>
    {/* A single, bolder path that inherits its color for consistency */}
    <path
      d="M7 4H10V10.5L17 4H20L12 12L20 20H17L10 13.5V20H7V4Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  </svg>
);

export default KickIcon;
