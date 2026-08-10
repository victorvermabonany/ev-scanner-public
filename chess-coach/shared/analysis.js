// Move-by-move blunder detection.
//
// The idea: evaluate every position in the game, then for each move compare
// the eval before it with the eval after it. If the player who moved gave up
// more than `threshold` pawns of evaluation, that's a blunder.

import { Chess } from 'chess.js';
import { classifyBlunder, parseClocks, parseTimeControl } from './classify.js';
import { explainMove } from './explain.js';

export const DEFAULT_THRESHOLD_PAWNS = 2.5;
export const DEFAULT_DEPTH = 12;

/**
 * Every move gets a grade from how much evaluation it gave away, in pawns.
 * These bounds are fixed, unlike the configurable blunder `threshold` used
 * for the weekly summary — a review reads the same whatever that is set to.
 */
export const MOVE_CLASSES = {
  blunder: 2.5,
  mistake: 1.0,
  inaccuracy: 0.5,
};

export function classifyMove(lossCp) {
  const pawns = lossCp / 100;
  if (pawns >= MOVE_CLASSES.blunder) return 'blunder';
  if (pawns >= MOVE_CLASSES.mistake) return 'mistake';
  if (pawns >= MOVE_CLASSES.inaccuracy) return 'inaccuracy';
  return 'good';
}

// Mate gets a sentinel score far outside normal centipawn range.
const MATE_CP = 100_000;

// Evals are clamped before measuring a swing. Without this, "winning" and
// "even more winning" (+9 -> +30, or mate-in-5 -> mate-in-3) would register
// as huge swings, and every move in a won endgame would look like a blunder.
// Clamping at 10 pawns means a swing only counts when it crosses ground that
// actually matters.
const CLAMP_CP = 1000;

/** Single number for comparisons, from White's perspective. */
function toComparableCp({ cp, mate, terminal }) {
  if (terminal === 'white_mates') return MATE_CP;
  if (terminal === 'black_mates') return -MATE_CP;
  if (mate !== null && mate !== undefined) {
    return mate > 0 ? MATE_CP : -MATE_CP;
  }
  return cp ?? 0;
}

function clamp(value) {
  return Math.max(-CLAMP_CP, Math.min(CLAMP_CP, value));
}

/** "+1.25", "-0.40", "#4" (White mates), "#-4" (Black mates). */
export function formatEval({ cp, mate, terminal }) {
  if (terminal === 'white_mates') return '#(mate)';
  if (terminal === 'black_mates') return '#-(mate)';
  if (terminal === 'draw') return '0.00 (draw)';
  if (mate !== null && mate !== undefined) return `#${mate}`;
  if (cp === null || cp === undefined) return 'n/a';
  const pawns = cp / 100;
  return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
}

/**
 * Evaluate a position that the game has already ended in, without asking the
 * engine — a mated side has no move to search, so Stockfish has nothing
 * useful to report.
 */
function terminalEval(chess) {
  if (chess.isCheckmate()) {
    // The side to move is mated, so the *other* side delivered it.
    return chess.turn() === 'w'
      ? { cp: null, mate: null, terminal: 'black_mates' }
      : { cp: null, mate: null, terminal: 'white_mates' };
  }
  // stalemate, repetition, 50-move, insufficient material
  return { cp: 0, mate: null, terminal: 'draw' };
}

/**
 * Analyse one game's PGN and return every move plus the flagged blunders.
 *
 * @param {string} pgn
 * @param {object} options
 * @param {import('./engine.js').Engine} options.engine  a started Engine
 * @param {number} [options.depth]
 * @param {number} [options.threshold]     in pawns
 * @param {(done: number, total: number) => void} [options.onProgress]
 */
export async function analyseGame(pgn, {
  engine,
  depth = DEFAULT_DEPTH,
  threshold = DEFAULT_THRESHOLD_PAWNS,
  onProgress,
} = {}) {
  if (!engine) throw new Error('analyseGame needs a started Engine');

  const parser = new Chess();
  parser.loadPgn(pgn); // throws on malformed PGN
  const moves = parser.history({ verbose: true });

  if (moves.length === 0) {
    return { moves: [], blunders: [], positionsEvaluated: 0 };
  }

  await engine.newGame();

  // Verbose history carries the FEN before and after every move, including
  // for games that start from a custom position (a [FEN] header), so there's
  // no need to replay the moves by hand.
  //
  // The position after move i is the position before move i+1, so the whole
  // game is just moves.length + 1 distinct positions — each one is evaluated
  // exactly once, which halves the engine work.
  const positions = [moves[0].before, ...moves.map((move) => move.after)];

  const played = moves.map((move) => ({
    san: move.san,
    color: move.color, // 'w' | 'b'
    from: move.from,
    to: move.to,
    // The FEN's fullmove counter before the move is the move number this
    // move belongs to, for both colours.
    moveNumber: Number(move.before.split(' ')[5]),
  }));

  // The final position may be checkmate/stalemate, which the engine can't
  // score; everything before it is a live position.
  const evals = [];
  for (const [index, fen] of positions.entries()) {
    const isLast = index === positions.length - 1;
    const board = new Chess(fen);

    evals.push(
      isLast && board.isGameOver() ? terminalEval(board) : await engine.evaluate(fen, depth)
    );
    onProgress?.(index + 1, positions.length);
  }

  // Context for categorising blunders. Both come out of the PGN itself —
  // Chess.com writes a clock into every move comment, and the TimeControl
  // header says what the clock started at.
  const clocks = parseClocks(pgn);
  const timeControl = parseTimeControl(parser.getHeaders()?.TimeControl);

  const analysed = [];
  const blunders = [];

  for (const [index, move] of played.entries()) {
    const evalBefore = evals[index];
    const evalAfter = evals[index + 1];

    // Both evals are White-relative. Flip for Black so that a positive loss
    // always means "the player who moved made their own position worse".
    const beforeCp = clamp(toComparableCp(evalBefore));
    const afterCp = clamp(toComparableCp(evalAfter));
    const lossCp = move.color === 'w' ? beforeCp - afterCp : afterCp - beforeCp;

    const playedEnginesMove =
      Boolean(evalBefore.bestMove) &&
      evalBefore.bestMove.slice(0, 4) === `${move.from}${move.to}`;

    const record = {
      ply: index + 1,
      moveNumber: move.moveNumber,
      color: move.color,
      san: move.san,
      fenBefore: positions[index],
      fenAfter: positions[index + 1],
      evalBefore,
      evalAfter,
      lossCp,
      // Playing the engine's own top choice can still measure a small loss,
      // because the two positions were evaluated by separate searches. Grading
      // the engine's move an inaccuracy would be nonsense, so it's good by
      // definition.
      classification: playedEnginesMove ? 'good' : classifyMove(lossCp),
      matchedEngine: playedEnginesMove,
      isBlunder: !playedEnginesMove && lossCp >= threshold * 100,
    };

    analysed.push(record);

    // Anything short of "good" gets a cause and a sentence. Good moves need
    // neither, and skipping them keeps the per-move work down.
    if (record.classification !== 'good') {
      // The engine's preferred move in the position this was played from —
      // already known, since that position was evaluated.
      const { category, categories, details } = classifyBlunder(record, {
        clocks,
        timeControl,
        bestMove: evalBefore.bestMove ?? null,
      });
      Object.assign(record, { category, categories, categoryDetails: details });
      record.explanation = explainMove(record);
    }

    if (record.isBlunder) blunders.push(record);
  }

  return { moves: analysed, blunders, positionsEvaluated: positions.length };
}
