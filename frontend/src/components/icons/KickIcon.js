import React from 'react';

const KickIcon = ({
  size = 24,
  color = 'currentColor',
  className,
  'aria-label': ariaLabel = 'Kick',
  ...props
}) => (
  <svg
    viewBox="0 0 250 250"
    width={size}
    height={size}
    fill={color}
    role="img"
    aria-label={ariaLabel}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path d="M229.3 26.9L138 107.8v-57H113v135h25v-68l91.3 80.9h25v-96H250V0h-20.7z" />
  </svg>
);

export default KickIcon;
