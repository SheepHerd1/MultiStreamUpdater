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
      <mask id="kick-negative-k-mask">
        {/* Start with a solid white area */}
        <rect width="100%" height="100%" fill="white" />
        {/* Use a black 'K' path to punch a hole in the mask. This is more reliable than text. */}
        <path 
          d="M8 4H10V11L16 4H18L11.5 12L18 20H16L10 13V20H8V4Z" 
          fill="black" 
        />
      </mask>
    </defs>
    {/* The hard shadow layer: a solid, offset rectangle with the K punched out */}
    <rect 
      x="3" y="3" 
      width="20" height="20" 
      rx="4" 
      fill="rgba(0,0,0,0.25)" 
      mask="url(#kick-negative-k-mask)" 
    />
    {/* The main shape, with the K cut out by the mask */}
    <rect 
      x="2" y="2" 
      width="20" height="20" 
      rx="4" 
      fill="currentColor" 
      mask="url(#kick-negative-k-mask)" 
    />
  </svg>
);

export default KickIcon;
