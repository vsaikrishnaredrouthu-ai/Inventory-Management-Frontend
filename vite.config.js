import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the Vite server forwards API and uploaded-image requests to the Express backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5001',
      '/uploads': 'http://localhost:5001',
    },
  },
});
