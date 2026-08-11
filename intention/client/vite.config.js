import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so a build works wherever it is served from.
  base: './',
  server: {
    port: 5273,
    host: true,
    fs: {
      // ../shared is outside the client folder but part of this project.
      allow: ['..'],
    },
    // Anything the app fetches from /api/* goes to the Node server, so the
    // browser never has to care about the second port.
    proxy: {
      '/api': 'http://localhost:3101',
    },
  },
});
