import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';

const ThemeToggleButton = () => {
    const { theme, toggleTheme } = useContext(ThemeContext);

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-btn"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
            {theme === 'light' ? (
                <MoonIcon className="theme-toggle-icon" />
            ) : (
                <SunIcon className="theme-toggle-icon" />
            )}
        </button>
    );
};

export default ThemeToggleButton;