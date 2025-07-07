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
      <mask id="kick-negative-k">
        {/* Start with a solid white area */}
        <rect width="100%" height="100%" fill="white" />
        {/* Use a black 'K' to create a transparent hole in the mask */}
        <text
          x="12"
          y="12"
          dy=".35em"
          textAnchor="middle"
          fontSize="16"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          fill="black"
        >
          K
        </text>
      </mask>
    </defs>
    {/* The hard shadow layer: a solid, offset rectangle */}
    <rect x="3" y="3" width="20" height="20" rx="4" fill="rgba(0,0,0,0.2)" mask="url(#kick-negative-k)" />
    {/* The main shape, with the K cut out by the mask */}
    <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" mask="url(#kick-negative-k)" />
    {/* The outline layer: Draw the K again, but as a stroke on top */}
    <text
      x="12"
      y="12"
      dy=".35em"
      textAnchor="middle"
      fontSize="16"
      fontWeight="900"
      fontFamily="system-ui, sans-serif"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      K
    </text>
  </svg>
);

export default KickIcon;
