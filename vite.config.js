
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import wasm from 'vite-plugin-wasm';

export default defineConfig(({ mode }) => {
  // Determine the environment (e.g., check if it's Chrome)
  const isChrome = mode === 'chrome';


  // Define the background script and manifest file based on the mode
  const backgroundScript = isChrome ? 'src/background.js' : 'src/firefoxbg.js';
  const manifestFile = isChrome ? 'src/manifest/chrome.json' : 'src/manifest/firefox.json';
  return {
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          index: 'index.html', // Main popup UI
          background: backgroundScript, // Dynamically set background script
          content: 'src/content.js',
          injection: 'src/injection.js'
        },
        output: {
          entryFileNames: '[name].js', // Keeps file names simple (background.js, index.js, etc.)
          manualChunks: {
            vendor: ['react', 'react-dom'], // Example of separating vendor libraries
          },
        },
      },
      chunkSizeWarningLimit: 1000, // Adjust the warning limit if needed
    },
    plugins: [
      react(),
      wasm(),
      {
        // Custom plugin to copy the correct manifest.json from src to dist
        name: 'copy-manifest',
        writeBundle() {
          const sourcePath = path.resolve(__dirname, manifestFile); // From src folder
          const destPath = path.resolve(__dirname, 'dist', 'manifest.json'); // To dist folder
          if (!fs.existsSync(sourcePath)) {
            throw new Error(`Manifest file not found: ${sourcePath}`);
          }
          fs.copyFileSync(sourcePath, destPath);
        },
      },

    ],
    // publicDir: "public" // Optional, only if you still need static assets from public
  };
});
