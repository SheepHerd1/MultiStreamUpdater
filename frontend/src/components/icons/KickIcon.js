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
      <clipPath id="kick-logo-clip-path">
        {/* 
          This clip-path defines a single shape. It starts with the outer
          rounded rectangle and then uses the K's path to "punch a hole" in it.
          The 'evenodd' rule is what makes the punch-out effect work.
        */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4 2h16c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zM8 4h2v7l6-7h2l-6.5 8L18 20h-2l-6-7v7H8V4z"
        />
      </clipPath>
    </defs>
    
    {/* The hard shadow layer: a solid color filling the entire viewbox, offset, and then clipped by our shape. */}
    <rect 
      x="1" y="1" 
      width="24" height="24" 
      fill="rgba(0,0,0,0.25)" 
      clipPath="url(#kick-logo-clip-path)" 
    />
    
    {/* The main shape, also clipped by the same path. */}
    <rect 
      x="0" y="0" 
      width="24" height="24" 
      fill="currentColor" 
      clipPath="url(#kick-logo-clip-path)" 
    />
  </svg>
);

export default KickIcon;
