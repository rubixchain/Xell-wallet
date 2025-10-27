
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import wasm from 'vite-plugin-wasm';

export default defineConfig(({ mode }) => {
  const isChrome = mode === 'chrome';


  const backgroundScript = isChrome ? 'src/background.js' : 'src/firefoxbg.js';
  const manifestFile = isChrome ? 'src/manifest/chrome.json' : 'src/manifest/firefox.json';
  return {
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          index: 'index.html',
          background: backgroundScript,
          content: 'src/content.js',
          injection: 'src/injection.js'
        },
        output: {
          entryFileNames: '[name].js',
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    plugins: [
      react(),
      wasm(),
      {
        name: 'copy-manifest',
        writeBundle() {
          const sourcePath = path.resolve(__dirname, manifestFile);
          const destPath = path.resolve(__dirname, 'dist', 'manifest.json');
          if (!fs.existsSync(sourcePath)) {
            throw new Error(`Manifest file not found: ${sourcePath}`);
          }
          fs.copyFileSync(sourcePath, destPath);
        },
      },

    ],
  };
});
