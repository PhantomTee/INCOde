import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite WebSocket errors for a cleaner user experience
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('[vite] failed to connect to websocket')) return;
    originalError.apply(console, args);
  };
  
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('WebSocket')) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
