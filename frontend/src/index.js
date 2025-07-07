import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { TokenRefreshProvider } from './context/TokenRefreshContext';
import { ThemeProvider } from './context/ThemeContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ThemeProvider>
    <TokenRefreshProvider>
      <App />
    </TokenRefreshProvider>
  </ThemeProvider>
);