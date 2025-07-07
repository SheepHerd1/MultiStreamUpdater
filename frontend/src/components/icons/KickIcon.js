import React from 'react';

const KickIcon = ({
  size = 24,
  color = 'currentColor',
  className,
  'aria-label': ariaLabel = 'Kick'
}) => (
  <svg
    role="img"
    aria-label={ariaLabel}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <title>Kick</title>
    {/* Left vertical bar */}
    <path
      d="M2 3.857h6.143v16.293H2V3.857Z"
      fillRule="evenodd"
      clipRule="evenodd"
    />
    {/* K‑shaped arrow */}
    <path
      d="M22 3.857v16.293h-4.286v-5.714L12 20.15h-2.143l5.714-8.15-5.714-8.15H12l5.714 5.714V3.857H22Z"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);

export default KickIcon;
