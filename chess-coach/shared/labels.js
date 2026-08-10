// The eight move labels, in the shape Chess.com and Lichess use.
//
// Only some of these fall out of the eval swing. Being straight about which
// is which, because they are not equally trustworthy:
//
//   Blunder/Mistake/Inaccuracy/Good  exact — pure eval-swing thresholds.
//   Best                             exact — the move matched the engine's
//                                    first choice.
//   Great                            derived — the move was best AND the
//                                    runner-up was clearly worse, i.e. it was
//                                    close to the only move. Needs MultiPV 2.
//   Brilliant                        heuristic — a sound sacrifice: best (or
//                                    near it), leaves material takeable, and
//                                    the position still holds up. Chess.com's
//                                    real rule is proprietary; this will not
//                                    agree with it move for move.
//   Book                             approximate — read from the ECO opening
//                                    line in the PGN, not a real opening
//                                    database, so its depth is a rough edge.

import { Chess } from 'chess.js';
import { bestCapture } from './classify.js';

const PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

export const LABELS = [
  'brilliant',
  'great',
  'best',
  'good',
  'book',
  'inaccuracy',
  'mistake',
  'blunder',
];

export const LABEL_TEXT = {
  brilliant: 'Brilliant',
  great: 'Great',
  best: 'Best',
  good: 'Good',
  book: 'Book',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

/** Swing thresholds, in pawns. */
export const SWING = { blunder: 2.5, mistake: 1.0, inaccuracy: 0.5 };

/**
 * The runner-up must be this much worse for a move to count as the only one.
 * Set high on purpose: at 150 this fired ten times in a single game, which is
 * not what "great" is supposed to mean.
 */
const ONLY_MOVE_GAP_CP = 250;

/** Net material given up for a move to read as a sacrifice. */
const SACRIFICE_CP = 200;

/**
 * How many plies of this game were still opening theory, read from the ECO
 * line Chess.com writes into the PGN. That line looks like
 * "...5.Be2-d6-6.d4-Nbd7-7.O-O", so the largest move number in it is roughly
 * where theory stopped.
 *
 * Deliberately conservative: it counts through White's move only, so at worst
 * it under-reports book by a ply rather than labelling a real decision "Book".
 */
export function bookPlies(headers = {}) {
  const url = headers.ECOUrl ?? headers.ecourl;
  if (!url) return 0;

  const numbers = [...String(url).matchAll(/(\d+)\./g)].map((m) => Number(m[1]));
  if (numbers.length === 0) return 0;

  const lastMove = Math.max(...numbers);
  // Sanity cap: no opening line runs past move 20.
  return Math.min(2 * lastMove - 1, 40);
}

function swingLabel(lossCp) {
  const pawns = lossCp / 100;
  if (pawns >= SWING.blunder) return 'blunder';
  if (pawns >= SWING.mistake) return 'mistake';
  if (pawns >= SWING.inaccuracy) return 'inaccuracy';
  return 'good';
}

/** White-relative eval to a single number from the mover's point of view. */
function moverCp({ cp, mate, terminal }, color) {
  let value;
  if (terminal === 'white_mates') value = 10000;
  else if (terminal === 'black_mates') value = -10000;
  else if (mate != null) value = mate > 0 ? 10000 : -10000;
  else value = cp ?? 0;
  return color === 'w' ? value : -value;
}

/**
 * Label one move.
 *
 * @param {object} record   move record with evals, lossCp and fens
 * @param {object} options
 * @param {boolean} options.matchedEngine  played the engine's first choice
 * @param {number}  [options.bookPlies]    plies still in theory
 */
export function labelMove(record, { matchedEngine, bookPlies: book = 0, previousTo = null } = {}) {
  // Opening theory isn't a decision the player made, so it isn't graded.
  if (record.ply <= book) return 'book';

  const base = swingLabel(record.lossCp);

  // Anything that lost real ground is just that, however it was found.
  if (base !== 'good') return base;

  if (!matchedEngine) return 'good';

  // --- from here the move was the engine's own choice ---

  let played = null;
  try {
    played = new Chess(record.fenBefore).move(record.san);
  } catch {
    return 'best';
  }

  // Brilliant: a real sacrifice, meaning what the opponent can win back is
  // worth clearly more than what this move captured. Without netting off the
  // capture, every routine trade looked brilliant.
  const after = moverCp(record.evalAfter ?? {}, record.color);
  if (after >= -50) {
    const grabbed = played?.captured ? PIECE_VALUE[played.captured] : 0;
    const givenUp = bestCapture(record.fenAfter).gain - grabbed;
    if (givenUp >= SACRIFICE_CP) return 'brilliant';
  }

  // Great: the runner-up was clearly worse, so this was close to forced.
  // Taking back a piece that was just captured doesn't count, however large
  // the gap — it's obligatory, not a find.
  const gap = record.evalBefore?.gapCp;
  const isRecapture = Boolean(played?.captured) && played?.to === previousTo;
  if (!isRecapture && gap != null && gap >= ONLY_MOVE_GAP_CP) return 'great';

  return 'best';
}
