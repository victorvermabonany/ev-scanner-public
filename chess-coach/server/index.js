import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Placeholder endpoint so you can confirm the server is reachable.
// Real routes (game import, engine analysis, etc.) go here later.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'chess-coach' });
});

app.listen(PORT, () => {
  console.log(`Chess Coach API listening on http://localhost:${PORT}`);
});
