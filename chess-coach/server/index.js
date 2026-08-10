import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchRecentGames, ChessComError } from '../shared/chesscom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '..', 'client', 'dist');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Placeholder endpoint so you can confirm the server is reachable.
// Real routes (game import, engine analysis, etc.) go here later.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'chess-coach' });
});

// Recent games for a Chess.com player, newest first.
//   /api/games/hikaru
//   /api/games/hikaru?limit=5
app.get('/api/games/:username', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  try {
    const games = await fetchRecentGames(req.params.username, limit);
    res.json({ username: req.params.username, count: games.length, games });
  } catch (error) {
    if (error instanceof ChessComError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Something went wrong fetching games' });
  }
});

// In dev, the React app is served by Vite (port 5173) and only /api/*
// requests reach this server via its proxy. In production there's no Vite
// process, so this server also serves the client's built files directly —
// one process, one URL, nothing else to deploy or configure.
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Chess Coach API listening on http://localhost:${PORT}`);
});
