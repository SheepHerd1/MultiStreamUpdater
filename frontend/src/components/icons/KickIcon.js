import React from 'react';

const KickIcon = ({
  size = 24,
  color = 'currentColor',
  className,
  'aria-label': ariaLabel = 'Kick',
  ...props
}) => (
  <svg
    viewBox="0 0 933 300"
    width={size}
    height={(size * 300) / 933}
    fill={color}
    role="img"
    aria-label={ariaLabel}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path d="M0 0h140.6v300H0zM198.8 0h59.5l119.6 255c-9.3 9.6-28.6 13.6-56 13.6H157.7V0zm329.6 0h45.8v231.6c0 26 9.3 39 27.9 39s27.9-13 27.9-39V0h45.8v233.9c0 35.1-17.8 52.7-53.5 52.7s-53.4-17.6-53.4-52.7V0zm297.1 0h45.8v188.5c0 26 9.3 39 27.9 39s27.9-13 27.9-39V0h45.8v255c-36.8 0-54.2-17.6-54.2-52.7V0z" />
  </svg>
);

export default KickIcon;
