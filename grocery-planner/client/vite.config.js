import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SINGLE_FILE=1 builds the shareable preview: one chunk, no code splitting,
// and the Anthropic SDK swapped for a stub. See scripts/build-preview.mjs.
const singleFile = process.env.SINGLE_FILE === '1';

export default defineConfig({
  plugins: [react()],

  resolve: singleFile
    ? {
        alias: {
          '@anthropic-ai/sdk': fileURLToPath(
            new URL('./src/lib/sdk-unavailable.js', import.meta.url)
          ),
        },
      }
    : {},

  build: {
    outDir: singleFile ? 'dist-preview' : 'dist',
    // One chunk, so the whole app can be inlined into a single HTML file —
    // a hosted preview serves one page and nothing else.
    rollupOptions: singleFile ? { output: { inlineDynamicImports: true } } : {},
  },

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
