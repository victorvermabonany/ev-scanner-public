// Prints a player's recent games as raw JSON, to sanity-check the API pull.
//
//   npm run games -- hikaru
//   npm run games -- hikaru 5
//   npm run games -- hikaru 20 --summary
//
// --summary prints one line per game instead of the full objects.

import { fetchRecentGames, ChessComError } from '../../shared/chesscom.js';

const args = process.argv.slice(2);
const summaryOnly = args.includes('--summary');
const positional = args.filter((a) => !a.startsWith('--'));
const [username, limitArg] = positional;
const limit = Number(limitArg) || 20;

if (!username) {
  console.error('Usage: npm run games -- <username> [limit] [--summary]');
  process.exit(1);
}

try {
  const games = await fetchRecentGames(username, limit);
  console.log(`Fetched ${games.length} game(s) for "${username}"\n`);

  if (games.length === 0) {
    console.log('This player has no games in their Chess.com archives.');
  } else if (summaryOnly) {
    for (const game of games) {
      const played = new Date(game.end_time * 1000).toISOString().slice(0, 10);
      console.log(
        [
          played,
          (game.time_class ?? '?').padEnd(7),
          `${game.white.username} (${game.white.rating}) ${game.white.result}`,
          'vs',
          `${game.black.username} (${game.black.rating}) ${game.black.result}`,
          game.url,
        ].join('  ')
      );
    }
  } else {
    console.dir(games, { depth: null, maxStringLength: null });
  }
} catch (error) {
  if (error instanceof ChessComError) {
    console.error(`Error (${error.status}): ${error.message}`);
    process.exit(1);
  }
  throw error;
}
