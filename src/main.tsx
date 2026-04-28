import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { loader } from "@monaco-editor/react";
import App from './App.tsx';
import './index.css';

// Configure Monaco loader as a singleton to prevent "Duplicate definition" errors
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs'
  },
});

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
