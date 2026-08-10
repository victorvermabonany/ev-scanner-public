// Turns the classifier's findings into one plain sentence about a move.
//
// classify.js says *what* was wrong in structured form; this says it the way
// a person would. Kept separate so the detection logic and the wording can
// change independently.

import { Chess } from 'chess.js';

const PIECE_NAMES = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

/**
 * Stand-in for the possessive, resolved when the sentence is shown.
 *
 * Every move in a game gets explained, not just the player's own, so the
 * sentence can't hard-code "your" — that reads as an accusation when you're
 * looking at what your opponent did. The side that moved isn't known here
 * relative to whoever is reading, so the choice is deferred to personalise().
 */
const OWNER = '{S}';

/**
 * Resolve the possessive in an explanation.
 *
 * @param {string} text
 * @param {boolean} options.mine  the reader played this move
 */
export function personalise(text, { mine = true } = {}) {
  // Explanations cached before the placeholder existed have no token in them
  // and pass through untouched.
  return text ? text.split(OWNER).join(mine ? 'your' : 'their') : text;
}

/**
 * What to say about a move that didn't cost anything.
 *
 * These have no cause to diagnose, so there is nothing for explainMove to
 * find — but leaving them silent means the review goes blank on most moves,
 * which is where a plain-language read is meant to be the whole point.
 *
 * @param {string} label              one of the eight move labels
 * @param {string} [options.bestSan]  the engine's move, where it differs
 * @param {number} [options.lossCp]   what the move gave up, in centipawns
 */
export function noteForMove(label, { bestSan = null, lossCp = 0 } = {}) {
  // A move can match the engine's first choice and still show a swing, in a
  // position where everything loses ground. Those get no cause from
  // explainMove — there is nothing to blame — but they still need saying,
  // and "you played the best move available" is the honest version.
  if (label === 'inaccuracy' || label === 'mistake' || label === 'blunder') {
    const pawns = Math.max(0, lossCp / 100).toFixed(1);
    return `Still the engine's choice — the position was already slipping, and this cost ${pawns} pawns.`;
  }

  switch (label) {
    case 'book':
      return 'Opening theory — played from the book, not decided over the board.';
    case 'brilliant':
      return 'A sacrifice that works: material handed over, and the position still holds.';
    case 'great':
      return 'Close to the only move here — the alternatives were all clearly worse.';
    case 'best':
      return "The engine's first choice. Nothing was better.";
    case 'good':
      return bestSan
        ? `Solid. The engine prefers ${bestSan}, but this costs next to nothing.`
        : 'Solid — the evaluation barely moved.';
    default:
      return null;
  }
}

/** Engine moves arrive as UCI; people read SAN. */
function toSan(fen, uci) {
  if (!fen || !uci || uci.length < 4) return null;
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    return move?.san ?? null;
  } catch {
    return null;
  }
}

/** What the move itself did — needed to tell a hang from a recapture. */
function playedMove(record) {
  try {
    const chess = new Chess(record.fenBefore);
    return chess.move(record.san);
  } catch {
    return null;
  }
}

/**
 * One line explaining a move that went wrong. Order matters: the most
 * concrete finding wins, same priority the categories use.
 *
 * @param {object} record  a move record from analyseGame, already classified
 * @returns {string}
 */
export function explainMove(record) {
  const details = record.categoryDetails ?? {};
  const move = playedMove(record);

  // A capture that can be recaptured is a trade, not a hanging piece. Without
  // this, every ordinary exchange reads as "you left your queen hanging".
  const isRecapture =
    details.hanging_piece &&
    move?.captured &&
    details.hanging_piece.square === move.to;

  if (details.hanging_piece && !isRecapture) {
    const name = PIECE_NAMES[details.hanging_piece.pieceType] ?? 'material';
    return `This left ${OWNER} ${name} on ${details.hanging_piece.square} hanging.`;
  }

  if (details.missed_tactic) {
    const best = toSan(record.fenBefore, record.evalBefore?.bestMove);
    const pattern = details.missed_tactic.patterns?.[0]?.name ?? 'tactic';
    return best
      ? `${best} was stronger — there was a ${pattern} available.`
      : `A ${pattern} was available instead.`;
  }

  if (details.king_safety) {
    return `This left ${OWNER} king exposed on ${details.king_safety.kingSquare}.`;
  }

  if (details.time_trouble) {
    return `Played with ${details.time_trouble.secondsLeft}s left on the clock.`;
  }

  // Nothing matched a pattern, so state the cost rather than invent a cause.
  const pawns = Math.max(0, record.lossCp / 100).toFixed(1);
  const best = toSan(record.fenBefore, record.evalBefore?.bestMove);
  return best
    ? `${best} was better; this gave up ${pawns} pawns.`
    : `This gave up ${pawns} pawns.`;
}
