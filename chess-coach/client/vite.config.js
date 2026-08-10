import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Anything the app fetches from /api/* is forwarded to the Node server,
    // so the browser never has to care about the second port.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
