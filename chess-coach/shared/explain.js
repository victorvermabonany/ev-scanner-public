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
    return `This left your ${name} on ${details.hanging_piece.square} hanging.`;
  }

  if (details.missed_tactic) {
    const best = toSan(record.fenBefore, record.evalBefore?.bestMove);
    const pattern = details.missed_tactic.patterns?.[0]?.name ?? 'tactic';
    return best
      ? `${best} was stronger — there was a ${pattern} available.`
      : `A ${pattern} was available instead.`;
  }

  if (details.king_safety) {
    return `This left your king exposed on ${details.king_safety.kingSquare}.`;
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
