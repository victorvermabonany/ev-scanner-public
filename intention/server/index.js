import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isIsoDate, summarize, todayIso } from '../shared/streak.js';
import { BadRequest, readCheckIns, saveCheckIn } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '..', 'client', 'dist');

const app = express();
const PORT = process.env.PORT || 3101;

app.use(express.json());

/**
 * "Today" belongs to whoever is looking at the screen, not to the machine the
 * server happens to run on, so the client sends its own local date and the
 * server only falls back to its own when it is missing.
 */
function resolveToday(value) {
  return isIsoDate(value) ? value : todayIso();
}

// Everything both screens render, in one round trip.
app.get('/api/summary', async (req, res, next) => {
  try {
    const checkIns = await readCheckIns();
    res.json(summarize(checkIns, resolveToday(req.query.today)));
  } catch (error) {
    next(error);
  }
});

// Record (or change) how a day went.
app.post('/api/check-ins', async (req, res, next) => {
  try {
    const date = resolveToday(req.body?.date);
    const checkIns = await saveCheckIn({ date, mood: req.body?.mood });
    res.json(summarize(checkIns, date));
  } catch (error) {
    next(error);
  }
});

// In dev the React app comes from Vite on port 5173 and only /api/* reaches
// here. Built, this server serves the app too — one process, one URL.
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use((error, req, res, next) => {
  if (error instanceof BadRequest) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Intention API listening on http://localhost:${PORT}`);
});
