// Builds a week's summary from real games and writes it up in all three
// coach voices.
//
//   npm run report -- vb_vic11
//   npm run report -- vb_vic11 --games 10 --days 30
//   npm run report -- vb_vic11 --coach mentor      # just one voice
//   npm run report -- vb_vic11 --json              # the summary JSON only

import { fetchRecentGames, ChessComError } from '../../shared/chesscom.js';
import { Engine } from '../engine.js';
import { analyseGame, DEFAULT_DEPTH } from '../../shared/analysis.js';
import { summariseWeek } from '../../shared/weekly.js';
import { writeReport, writeAllReports, COACHES } from '../../shared/coach.js';

const args = process.argv.slice(2);
const wantsJson = args.includes('--json');

function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
}

const depth = Number(flag('depth', DEFAULT_DEPTH));
const days = Number(flag('days', 7));
const limit = Number(flag('games', 10));
const onlyCoach = flag('coach', null);

const positional = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i].startsWith('--')) {
    if (['depth', 'days', 'games', 'coach'].includes(args[i].slice(2))) i += 1;
    continue;
  }
  positional.push(args[i]);
}
const [username] = positional;

if (!username) {
  console.error(
    'Usage: npm run report -- <username> [--games N] [--days N] [--depth N] [--coach name] [--json]'
  );
  process.exit(1);
}

const engine = new Engine({ depth });

try {
  console.error(`Fetching last ${limit} games for "${username}"...`);
  const games = (await fetchRecentGames(username, limit)).filter(
    (game) => game.rules === 'chess'
  );

  await engine.start();
  console.error(`Analysing with ${engine.kind} engine at depth ${depth}...`);

  const entries = [];
  for (const [index, game] of games.entries()) {
    console.error(`  game ${index + 1}/${games.length}`);
    entries.push({ game, analysis: await analyseGame(game.pgn, { engine, depth }) });
  }

  // Anchor the window to the most recent game, so a demo still has data in
  // it even if the account has been quiet lately.
  const latest = entries.length
    ? new Date(Math.max(...entries.map((e) => e.game.end_time * 1000)))
    : new Date();

  const summary = summariseWeek(entries, { username, now: latest, days });

  if (wantsJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else if (onlyCoach) {
    console.log(writeReport(onlyCoach, summary));
  } else {
    console.log(`\nWeek of ${summary.from} to ${summary.to} — ${summary.username}`);
    console.log(
      `${summary.games} games · ${summary.blunders} blunders · ` +
        `top area: ${summary.topCategoryLabel ?? 'n/a'}\n`
    );
    const reports = writeAllReports(summary);
    for (const [coach, text] of Object.entries(reports)) {
      console.log('─'.repeat(72));
      console.log(COACHES[coach].toUpperCase());
      console.log('─'.repeat(72));
      console.log(text);
      console.log();
    }
  }
} catch (error) {
  if (error instanceof ChessComError) {
    console.error(`Chess.com error (${error.status}): ${error.message}`);
    process.exit(1);
  }
  throw error;
} finally {
  await engine.quit();
}
