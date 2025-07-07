import React from 'react';

const KickIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
  >
    <title>Kick</title>
    <g>
      {/* The outline, drawn first as a fatter, black version of the K */}
      <path
        d="M7 4H10V10.5L17 4H20L12 12L20 20H17L10 13.5V20H7V4Z"
        fill="#000"
        stroke="#000"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* The main K shape, drawn on top with the current text color */}
      <path
        d="M7 4H10V10.5L17 4H20L12 12L20 20H17L10 13.5V20H7V4Z"
        fill="currentColor"
      />
    </g>
  </svg>
);

export default KickIcon;
