import express from 'express';
import { fetchRecentGames, ChessComError } from './chesscom.js';

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

app.listen(PORT, () => {
  console.log(`Chess Coach API listening on http://localhost:${PORT}`);
});
