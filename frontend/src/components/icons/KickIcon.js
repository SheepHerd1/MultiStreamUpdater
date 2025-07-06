import React from 'react';

// A simple SVG component for the Kick icon
const KickIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M19.53 3.47H4.47L3 5.33v13.34l1.47 1.86h4.41l2.21 2.53h3.8l5.64-5.64V3.47zm-6.36 11.3l-2.94 2.94h-2.94l-1.47-1.47V5.33h13.24v7.97l-2.9 2.47z" />
  </svg>
);

export default KickIcon;