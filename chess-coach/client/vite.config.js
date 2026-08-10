import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Vite rejects requests with an unrecognized Host header by default
    // (DNS-rebinding protection). Quick tunnels (ngrok/cloudflared) arrive
    // with a random *.trycloudflare.com / *.ngrok-free.app host, so those
    // need to be allow-listed explicitly for tunneled access to work.
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app'],
    // Anything the app fetches from /api/* is forwarded to the Node server,
    // so the browser never has to care about the second port.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
