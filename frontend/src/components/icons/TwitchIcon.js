import React from 'react';

// A simple SVG component for the Twitch icon
const TwitchIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M2.149 0L.537 4.119v16.836h5.373V24l4.298-2.985h3.224L23.463 10.7V0H2.149zm19.284 9.672l-3.761 3.761h-4.298l-2.687 2.687v-2.687H6.448V2.149h14.985v7.523zM16.09 4.836h2.149v5.373h-2.149V4.836zm-5.373 0h2.149v5.373H10.72V4.836z" />
  </svg>
);

export default TwitchIcon;