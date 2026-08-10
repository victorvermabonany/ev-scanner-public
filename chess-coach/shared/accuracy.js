// Accuracy percentage, using Lichess's published formulas.
//
// Chess.com's accuracy is proprietary, so this will not match a Chess.com
// review exactly. Lichess documents theirs, which makes it the honest one to
// implement: evals become win percentages, and each move is scored by how
// much winning chance it gave away.

/** Centipawns to a win percentage for the side the score belongs to. */
export function winPercent(cp) {
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

/** Lichess's per-move accuracy curve, from the drop in winning chances. */
export function moveAccuracy(winBefore, winAfter) {
  const drop = Math.max(0, winBefore - winAfter);
  const value = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669;
  return Math.max(0, Math.min(100, value));
}

/** White-relative eval to a plain centipawn number. */
function toCp({ cp, mate, terminal } = {}) {
  if (terminal === 'white_mates') return 1000;
  if (terminal === 'black_mates') return -1000;
  if (mate != null) return mate > 0 ? 1000 : -1000;
  return cp ?? 0;
}

/**
 * Accuracy for each colour across a game.
 *
 * @param {object[]} moves  analysed move records, in order
 * @returns {{w: number|null, b: number|null}} percentages
 */
export function gameAccuracy(moves) {
  const per = { w: [], b: [] };

  for (const move of moves) {
    const before = toCp(move.evalBefore);
    const after = toCp(move.evalAfter);

    // Win percentages from the mover's side, so a drop always means worse.
    const winBefore = move.color === 'w' ? winPercent(before) : 100 - winPercent(before);
    const winAfter = move.color === 'w' ? winPercent(after) : 100 - winPercent(after);

    per[move.color].push(moveAccuracy(winBefore, winAfter));
  }

  // Lichess averages an arithmetic and a harmonic mean. The harmonic half is
  // what stops a long game of quiet moves from burying three blunders: a
  // plain mean gave 96% to a game with 3 blunders and 5 mistakes.
  const combined = (list) => {
    if (list.length === 0) return null;
    const arithmetic = list.reduce((a, b) => a + b, 0) / list.length;
    const harmonic = list.length / list.reduce((a, b) => a + 1 / Math.max(b, 1), 0);
    return Math.round(((arithmetic + harmonic) / 2) * 10) / 10;
  };

  return { w: combined(per.w), b: combined(per.b) };
}
