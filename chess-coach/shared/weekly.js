// Rolls a set of analysed games up into one week's worth of numbers.
//
// This is the input the coach personas read from. It's deliberately plain
// data — no prose, no judgement — so the writing layer stays swappable.

import { CATEGORY_LABELS } from './classify.js';

const DRAW_RESULTS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
]);

/** Which colour the player had, comparing names case-insensitively. */
function sideOf(game, username) {
  const target = username.toLowerCase();
  if (game.white?.username?.toLowerCase() === target) return 'w';
  if (game.black?.username?.toLowerCase() === target) return 'b';
  return null;
}

function outcomeFor(game, side) {
  const result = (side === 'w' ? game.white : game.black)?.result;
  if (result === 'win') return 'win';
  if (DRAW_RESULTS.has(result)) return 'draw';
  return 'loss';
}

/**
 * @param {Array<{game: object, analysis: object}>} entries
 *        each `analysis` is what analyseGame() returned for that game
 * @param {object} options
 * @param {string} options.username   whose week this is
 * @param {Date}   [options.now]      end of the window
 * @param {number} [options.days]     window length, default 7
 */
export function summariseWeek(entries, { username, now = new Date(), days = 7 } = {}) {
  if (!username) throw new Error('summariseWeek needs a username');

  const to = now;
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  const inWindow = entries.filter(({ game }) => {
    const played = new Date(game.end_time * 1000);
    return played >= from && played <= to;
  });

  const byCategory = {};
  const byTimeClass = {};
  const record = { win: 0, loss: 0, draw: 0 };
  const drills = [];
  // One row per game, oldest first — the raw material for a scoresheet-style
  // strip, which needs each game individually rather than a total.
  const perGame = [];
  // Full move-by-move reviews. Positions are NOT stored: a FEN per ply would
  // be tens of kilobytes a game, so the review replays the moves from the
  // starting position instead.
  const gameLog = [];

  let moves = 0;
  let blunders = 0;
  let cleanGames = 0;
  let worstGame = null;

  // The player's own rating, as Chess.com reported it on each game. Kept per
  // time class because rapid, blitz and bullet are separate pools and a
  // player is routinely a few hundred points apart across them — averaging
  // them together would compare them against the wrong baseline.
  const ratingsByClass = {};

  for (const { game, analysis } of inWindow) {
    const side = sideOf(game, username);

    // Only the player's own blunders — not the opponent's.
    const own = analysis.blunders.filter((b) => b.color === side);

    moves += analysis.moves.filter((m) => m.color === side).length;
    blunders += own.length;
    if (own.length === 0) cleanGames += 1;

    for (const blunder of own) {
      byCategory[blunder.category] = (byCategory[blunder.category] ?? 0) + 1;

      // Enough to replay the position as a drill without re-running the
      // engine: the position, what was played, and what the engine wanted.
      // Kept deliberately narrow because this ends up in localStorage.
      drills.push({
        id: `${game.uuid ?? game.url}#${blunder.ply}`,
        fen: blunder.fenBefore,
        played: blunder.san,
        bestMove: blunder.evalBefore?.bestMove ?? null, // UCI, e.g. "g1f3"
        category: blunder.category,
        moveNumber: blunder.moveNumber,
        color: blunder.color,
        evalBefore: blunder.evalBefore,
        evalAfter: blunder.evalAfter,
        lossCp: blunder.lossCp,
        details: blunder.categoryDetails ?? {},
        gameUrl: game.url,
        opponent: side === 'w' ? game.black?.username : game.white?.username,
      });
    }

    const timeClass = game.time_class ?? 'unknown';
    byTimeClass[timeClass] ??= { games: 0, blunders: 0 };
    byTimeClass[timeClass].games += 1;
    byTimeClass[timeClass].blunders += own.length;

    const rating = (side === 'w' ? game.white : game.black)?.rating;
    if (Number.isFinite(rating) && rating > 0) {
      (ratingsByClass[timeClass] ??= []).push({ rating, at: game.end_time ?? 0 });
    }

    const outcome = side ? outcomeFor(game, side) : null;
    if (outcome) record[outcome] += 1;

    // Counts by the eight review labels, for the player's own moves.
    const tally = {};
    for (const move of analysis.moves) {
      if (move.color === side) tally[move.label] = (tally[move.label] ?? 0) + 1;
    }

    gameLog.push({
      url: game.url,
      opponent: side === 'w' ? game.black?.username : game.white?.username,
      white: game.white?.username,
      black: game.black?.username,
      color: side,
      outcome: side ? outcomeFor(game, side) : null,
      timeClass,
      playedAt: new Date(game.end_time * 1000).toISOString().slice(0, 10),
      startFen: analysis.moves[0]?.fenBefore ?? null,
      tally,
      accuracy: analysis.accuracy,
      moves: analysis.moves.map((move) => ({
        ply: move.ply,
        moveNumber: move.moveNumber,
        color: move.color,
        san: move.san,
        lossCp: move.lossCp,
        classification: move.classification,
        label: move.label,
        explanation: move.explanation ?? null,
        // Enough to drive the eval bar and the best-move arrow without
        // storing a position per ply.
        cp: move.evalAfter?.cp ?? null,
        mate: move.evalAfter?.mate ?? null,
        terminal: move.evalAfter?.terminal ?? null,
        // Kept for every move, not just the costly ones: the review names the
        // engine's choice on quiet moves too, and two squares per ply is a
        // couple of kilobytes across a whole week.
        bestFrom: move.bestFrom ?? null,
        bestTo: move.bestTo ?? null,
      })),
    });

    perGame.push({
      blunders: own.length,
      outcome, // 'win' | 'loss' | 'draw' | null
      color: side, // 'w' | 'b'
      opponent: side === 'w' ? game.black?.username : game.white?.username,
      timeClass,
      url: game.url,
      playedAt: new Date(game.end_time * 1000).toISOString().slice(0, 10),
    });

    if (!worstGame || own.length > worstGame.blunders) {
      worstGame = {
        url: game.url,
        blunders: own.length,
        opponent:
          side === 'w' ? game.black?.username : game.white?.username,
        timeClass,
      };
    }
  }

  // The category the player lost the most points to — what to work on.
  const ranked = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const [topCategory, topCategoryCount] = ranked[0] ?? [null, 0];

  // One rating to compare against: the pool they played most of these games
  // in, at its most recent value. Most recent rather than an average, because
  // a rating that moved 80 points over the window should be read at where it
  // ended up.
  const mainPool = Object.entries(ratingsByClass).sort(
    (a, b) => b[1].length - a[1].length
  )[0];
  const rating = mainPool
    ? [...mainPool[1]].sort((a, b) => b.at - a.at)[0].rating
    : null;

  return {
    username,
    rating,
    ratingPool: mainPool?.[0] ?? null,
    ratingGames: mainPool?.[1].length ?? 0,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    days,
    games: inWindow.length,
    moves,
    blunders,
    blundersPerGame: inWindow.length ? Number((blunders / inWindow.length).toFixed(2)) : 0,
    cleanGames,
    byCategory,
    topCategory,
    topCategoryCount,
    topCategoryLabel: topCategory ? CATEGORY_LABELS[topCategory] : null,
    topCategoryShare: blunders ? Number((topCategoryCount / blunders).toFixed(2)) : 0,
    byTimeClass,
    record,
    worstGame,
    // Chess.com returns newest first; a scoresheet reads oldest first.
    perGame: [...perGame].reverse(),
    gameLog: [...gameLog].reverse(),
    // Only drills the engine actually gave a move for — a position with no
    // best move can't be practised.
    drills: drills.filter((drill) => drill.bestMove),
  };
}
