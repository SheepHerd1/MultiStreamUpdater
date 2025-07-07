import React from 'react';

const KickIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
  >
    <title>Kick</title>
    
    {/* 
      This is the most robust way to create the shape.
      We define a single path with two parts: the outer rounded rectangle
      and the inner "K". The 'evenodd' fill rule tells the SVG to treat
      the inner shape as a "hole". This avoids issues with clip-paths or masks.
    */}
    
    {/* The hard shadow layer, drawn first and offset by (1, 1) */}
    <path
      fillRule="evenodd"
      d="M7 3h12c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z M9 5h2v7l6-7h2l-6.5 8L19 21h-2l-6-7v7H9V5z"
      fill="rgba(0,0,0,0.25)"
    />
    
    {/* The main shape, drawn on top */}
    <path
      fillRule="evenodd"
      d="M6 2h12c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2z M8 4h2v7l6-7h2l-6.5 8L18 20h-2l-6-7v7H8V4z"
      fill="currentColor"
    />
  </svg>
);

export default KickIcon;
