// Measure how often real players blunder at each rating, using exactly the
// detector the app grades with — so the tier baseline is measured, not
// guessed.
//
// One row per GAME, carrying the rating Chess.com reported for the player in
// that game. Binning happens afterwards on that number rather than on a
// profile rating, because a player's blitz and rapid ratings can be hundreds
// of points apart and the profile rating says nothing about which pool a
// given game came from.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fetchRecentGames } from '/home/user/ev-scanner-public/chess-coach/shared/chesscom.js';
import { Engine } from '/home/user/ev-scanner-public/chess-coach/server/engine.js';
import { analyseGame } from '/home/user/ev-scanner-public/chess-coach/shared/analysis.js';

const players = JSON.parse(readFileSync('players.json', 'utf8'));
const GAMES_PER_PLAYER = Number(process.argv[2] ?? 5);
const DEPTH = 10;
const WORKERS = 4;
const OUT = 'baseline-games.json';

const rows = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
const alreadyDone = new Set(rows.map((r) => r.username));

const sideOf = (game, name) => {
  const t = name.toLowerCase();
  if (game.white?.username?.toLowerCase() === t) return 'w';
  if (game.black?.username?.toLowerCase() === t) return 'b';
  return null;
};

const tasks = players.flat().filter((p) => !alreadyDone.has(p.username));
let index = 0;
let saved = 0;

async function worker(id) {
  const engine = new Engine({ depth: DEPTH });
  await engine.start();
  for (;;) {
    const task = tasks[index++];
    if (!task) break;

    let games;
    try {
      games = (await fetchRecentGames(task.username, 40)).filter(
        (g) => g.rules === 'chess' && g.rated && g.time_class !== 'daily'
      );
    } catch (e) {
      console.error(`  ! ${task.username}: ${e.message}`);
      continue;
    }

    // One pool per player: whichever time class they played most of recently.
    const counts = {};
    for (const g of games) counts[g.time_class] = (counts[g.time_class] ?? 0) + 1;
    const pool = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const chosen = games.filter((g) => g.time_class === pool).slice(0, GAMES_PER_PLAYER);
    if (chosen.length < 3) continue;

    for (const game of chosen) {
      const side = sideOf(game, task.username);
      const rating = (side === 'w' ? game.white : game.black)?.rating;
      if (!side || !Number.isFinite(rating)) continue;
      try {
        const a = await analyseGame(game.pgn, { engine, depth: DEPTH });
        rows.push({
          username: task.username,
          pool,
          rating,
          moves: a.moves.filter((m) => m.color === side).length,
          blunders: a.blunders.filter((b) => b.color === side).length,
        });
      } catch {
        /* skip a game we can't read, same as the app does */
      }
    }
    saved += 1;
    writeFileSync(OUT, JSON.stringify(rows));
    const mine = rows.filter((r) => r.username === task.username);
    console.error(
      `[w${id}] ${task.username} · ${pool} · ${mine.length} games · rating ~` +
      `${Math.round(mine.reduce((s, r) => s + r.rating, 0) / mine.length)} · ` +
      `${(mine.reduce((s, r) => s + r.blunders, 0) / mine.length).toFixed(2)} blunders/game ` +
      `(${saved}/${tasks.length} players)`
    );
  }
  engine.quit();
}

await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i + 1)));
console.error(`done — ${rows.length} games from ${new Set(rows.map((r) => r.username)).size} players`);
