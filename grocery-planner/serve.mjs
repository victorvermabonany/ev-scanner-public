// A static file server for reviewing the built app locally.
//
// The built app is plain files, but it can't be opened straight off the disk:
// browsers refuse to load ES modules over file://. So this serves ../grocery
// over http on a local port, with no dependencies to install — Node alone is
// enough.
//
//     node grocery-planner/serve.mjs          → http://localhost:5180
//     PORT=8080 node grocery-planner/serve.mjs
//
// It listens on localhost only. Nothing is exposed to your network.

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../grocery', import.meta.url)));
const PORT = Number(process.env.PORT ?? 5180);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  // normalize() collapses any ../ before the path is joined to the root, so a
  // crafted URL can't read files outside the built app.
  const requested = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let path = join(ROOT, requested);

  try {
    const info = await stat(path);
    if (info.isDirectory()) path = join(path, 'index.html');
    await stat(path);
  } catch {
    // Single-page app: unknown paths fall back to the entry point.
    path = join(ROOT, 'index.html');
  }

  if (!path.startsWith(ROOT)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  response.writeHead(200, {
    'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
    // Reviewing means reloading after a rebuild; a cached bundle hides changes.
    'cache-control': 'no-store',
  });
  createReadStream(path).pipe(response);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try: PORT=5181 node grocery-planner/serve.mjs`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Grocery Planner is running at http://localhost:${PORT}\n`);
  console.log('  Serving:', ROOT);
  console.log('  Press Control-C to stop.\n');
});
