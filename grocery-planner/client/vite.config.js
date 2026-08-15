import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the built app works wherever it's served from —
  // the domain root, or a subfolder like /ev-scanner-public/grocery/.
  base: './',
  define: {
    // A stale page in a phone's cache looks identical to a fresh one, so the
    // build time in the footer makes it obvious which version is running.
    __BUILD_TIME__: JSON.stringify(
      new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
    ),
  },
  server: {
    port: 5174,
    host: true,
    // Quick tunnels arrive with a random host, which Vite rejects by default.
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app'],
    fs: {
      // ../shared is outside the client folder but part of this project.
      allow: ['..'],
    },
  },
});
