import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Buffer } from 'buffer';
import { Toaster } from 'react-hot-toast';
// Import config to ensure it loads when app starts
import { getConfigPromise } from '../config.js';
window.Buffer = Buffer;
window.global = window;

// Wait for config to load before rendering the app
getConfigPromise().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch((error) => {
 
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
});
