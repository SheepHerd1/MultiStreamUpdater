import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { TokenRefreshProvider } from './context/TokenRefreshContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <TokenRefreshProvider>
    <App />
  </TokenRefreshProvider>
);