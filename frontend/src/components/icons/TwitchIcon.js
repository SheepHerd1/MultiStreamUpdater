import React from 'react';

// A simple SVG component for the Twitch icon
const TwitchIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M21.504 23.333h-4.448l-2.224-2.224H9.992l-2.78 2.224H2.78v-5.56L0 14.44V2.78h21.504v11.112l-2.78 2.78v3.888l2.78 2.78zm-2.78-5.559V6.667H5.56v10.008h4.448l2.224 2.224h2.224l2.224-2.224h1.668v-2.224l2.224-2.224zm-5.56-1.112H11.5v-5.56h1.668v5.56zm-4.448 0H7.052v-5.56h1.668v5.56z" />
  </svg>
);

export default TwitchIcon;