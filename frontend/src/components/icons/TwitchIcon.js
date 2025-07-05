import React from 'react';

// A simple SVG component for the Twitch icon
const TwitchIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M11.571 4.714h1.715v5.143h-1.715V4.714zM6 4.714h1.714v5.143H6V4.714zM22.286 2H1.714C.771 2 0 2.771 0 3.714v12.857h5.143V20l3.428-3.429h3.429l10.286-10.285V3.714C24 2.771 23.229 2 22.286 2zM20.571 12L17.143 15.429h-4.286l-2.571 2.571v-2.571H5.143V4.714h15.428v7.286z" />
  </svg>
);

export default TwitchIcon;