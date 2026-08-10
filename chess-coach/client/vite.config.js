import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the built app works wherever it's served from —
  // the domain root, or a subfolder like /ev-scanner-public/chess/.
  base: './',
  define: {
    // Shown in the footer. A stale page in a phone's cache looks identical to
    // a fresh one, so having the build time on screen makes it obvious which
    // version is actually running.
    __BUILD_TIME__: JSON.stringify(
      new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
    ),
  },
  server: {
    port: 5173,
    host: true,
    // Vite rejects requests with an unrecognized Host header by default
    // (DNS-rebinding protection). Quick tunnels (ngrok/cloudflared) arrive
    // with a random *.trycloudflare.com / *.ngrok-free.app host, so those
    // need to be allow-listed explicitly for tunneled access to work.
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app'],
    fs: {
      // ../shared is outside the client folder but part of this project.
      allow: ['..'],
    },
    // Anything the app fetches from /api/* is forwarded to the Node server,
    // so the browser never has to care about the second port.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
