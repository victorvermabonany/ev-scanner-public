// Runs Stockfish over a real game from Chess.com and logs the blunders.
//
//   npm run analyze -- hikaru              # most recent game
//   npm run analyze -- hikaru 3            # 4th most recent (0-indexed)
//   npm run analyze -- hikaru 0 --depth 16
//   npm run analyze -- hikaru 0 --threshold 1.5
//   npm run analyze -- hikaru 0 --all      # every move, not just blunders

import { fetchRecentGames, ChessComError } from '../chesscom.js';
import { Engine } from '../engine.js';
import {
  analyseGame,
  formatEval,
  DEFAULT_DEPTH,
  DEFAULT_THRESHOLD_PAWNS,
} from '../analysis.js';

const args = process.argv.slice(2);
const showAll = args.includes('--all');

function flagValue(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = Number(args[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}

const depth = flagValue('depth', DEFAULT_DEPTH);
const threshold = flagValue('threshold', DEFAULT_THRESHOLD_PAWNS);

const positional = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i].startsWith('--')) {
    if (['depth', 'threshold'].includes(args[i].slice(2))) i += 1; // skip its value
    continue;
  }
  positional.push(args[i]);
}
const [username, indexArg] = positional;
const gameIndex = Number(indexArg) || 0;

if (!username) {
  console.error(
    'Usage: npm run analyze -- <username> [gameIndex] [--depth N] [--threshold N] [--all]'
  );
  process.exit(1);
}

const engine = new Engine({ depth });

try {
  console.log(`Fetching games for "${username}"...`);
  const games = await fetchRecentGames(username, gameIndex + 1);
  const game = games[gameIndex];

  if (!game) {
    console.error(`No game at index ${gameIndex} — only ${games.length} available.`);
    process.exit(1);
  }

  // Blunder detection assumes standard chess; variants have different rules
  // and Stockfish would score them wrong.
  if (game.rules !== 'chess') {
    console.error(`Skipping: this is a "${game.rules}" game, not standard chess.`);
    process.exit(1);
  }

  console.log(
    `\n${game.white.username} (${game.white.rating}) vs ` +
      `${game.black.username} (${game.black.rating})  —  ${game.time_class}`
  );
  console.log(game.url);

  await engine.start();
  console.log(`\nEngine: ${engine.kind}, depth ${depth}, threshold ${threshold} pawns`);

  const startedAt = Date.now();
  const { moves, blunders, positionsEvaluated } = await analyseGame(game.pgn, {
    engine,
    depth,
    threshold,
    // Only redraw a progress line on a real terminal; piped or redirected
    // output has no cursor to move, so \r would just spam one line per ply.
    onProgress: process.stdout.isTTY
      ? (done, total) => process.stdout.write(`\r  analysing position ${done}/${total}   `)
      : undefined,
  });
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  if (process.stdout.isTTY) process.stdout.write('\r');
  console.log(`  analysed ${positionsEvaluated} positions in ${seconds}s`);

  if (showAll) {
    console.log('\nEvery move:');
    for (const move of moves) {
      const marker = move.isBlunder ? ' <-- BLUNDER' : '';
      console.log(
        `  ${String(move.moveNumber).padStart(3)}${move.color === 'w' ? '.' : '...'} ` +
          `${move.san.padEnd(8)} ${formatEval(move.evalBefore).padStart(9)} -> ` +
          `${formatEval(move.evalAfter).padStart(9)}  lost ${(move.lossCp / 100)
            .toFixed(2)
            .padStart(6)}${marker}`
      );
    }
  }

  console.log(
    `\n=== ${blunders.length} blunder(s) found in ${moves.length} moves ` +
      `(swing >= ${threshold}) ===`
  );

  for (const blunder of blunders) {
    const player =
      blunder.color === 'w' ? game.white.username : game.black.username;
    console.log(
      `\nMove ${blunder.moveNumber}${blunder.color === 'w' ? '.' : '...'} ` +
        `${blunder.san}   (${player})`
    );
    console.log(`  eval before : ${formatEval(blunder.evalBefore)}`);
    console.log(`  eval after  : ${formatEval(blunder.evalAfter)}`);
    console.log(`  swing       : ${(blunder.lossCp / 100).toFixed(2)} pawns`);
    console.log(`  position    : ${blunder.fenBefore}`);
  }
} catch (error) {
  if (error instanceof ChessComError) {
    console.error(`\nChess.com error (${error.status}): ${error.message}`);
    process.exit(1);
  }
  throw error;
} finally {
  await engine.quit();
}
