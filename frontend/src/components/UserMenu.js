import React, { useState, useEffect, useRef } from 'react';
import './UserMenu.css';
import UserIcon from './icons/UserIcon';
import TwitchIcon from './icons/TwitchIcon';
import YouTubeIcon from './icons/YouTubeIcon';
import KickIcon from './icons/KickIcon';

const platformIcons = {
  twitch: TwitchIcon,
  youtube: YouTubeIcon,
  kick: KickIcon,
};

const UserMenu = ({ auth, onLogout, onIndividualLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // This effect handles closing the menu when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const connectedPlatforms = Object.entries(auth)
    .filter(([_, platformAuth]) => platformAuth !== null)
    .map(([key, platformAuth]) => ({
      key,
      name: platformAuth.userName || key.charAt(0).toUpperCase() + key.slice(1),
      Icon: platformIcons[key],
    }));

  const mainUser = auth.twitch || auth.youtube || auth.kick;

  if (!mainUser) {
    return null; // Don't render the menu if no one is logged in
  }

  return (
    <div className="user-menu-container" ref={menuRef}>
      <button
        className={`user-menu-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <UserIcon className="user-menu-icon" />
      </button>

      <div className={`user-menu-dropdown ${isOpen ? 'open' : ''}`}>
        <div className="user-menu-header">
          <p>{mainUser.userName}</p>
          <span>Manage Connections</span>
        </div>
        <ul className="user-menu-list">
          {connectedPlatforms.map(({ key, name, Icon }) => (
            <li key={key} className="user-menu-item">
              <div className="platform-info">
                <Icon className="platform-icon" />
                <span>{name}</span>
              </div>
              <button
                className="logout-individual-btn"
                onClick={() => {
                  onIndividualLogout(key);
                  setIsOpen(false); // Close menu after action
                }}
              >
                Logout
              </button>
            </li>
          ))}
          {connectedPlatforms.length > 1 && (
            <li className="user-menu-separator"></li>
          )}
          <li className="user-menu-item">
            <button
              className="logout-all-btn"
              onClick={onLogout}
            >
              Logout All Accounts
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default UserMenu;