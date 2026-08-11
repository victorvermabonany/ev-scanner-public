// The red/amber/green scale, used wherever something needs colouring by how
// good or bad it is.
//
// This file used to also hold a 0-100 "weekly score" — start at 100, lose 25
// points per blunder per game. That number is gone: it measured everyone
// against the same flat scale, so a 1900 and a 900 with the same blunder rate
// read as equally good, which is not true of either of them. Tiers, in
// tier.js, compare a player against what their own rating band actually does.

export const BANDS = { low: 'low', mid: 'mid', high: 'high' };

/**
 * Where a game accuracy sits on the scale.
 *
 * Accuracy is not a 0-100 spread in practice — almost every real game lands
 * between 60 and 95 — so splitting it into thirds would paint everything
 * green.
 */
export function accuracyBand(accuracy) {
  if (accuracy == null) return BANDS.mid;
  if (accuracy >= 85) return BANDS.high;
  if (accuracy >= 70) return BANDS.mid;
  return BANDS.low;
}

/**
 * Where a blunder category sits on the scale, by how much of the period's
 * total it accounts for. Dominant categories read as urgent; minor ones
 * recede.
 */
export function categoryBand(count, total) {
  if (!total) return BANDS.high;
  const share = count / total;
  if (share >= 0.4) return BANDS.low; // dominant problem
  if (share >= 0.2) return BANDS.mid;
  return BANDS.high; // minor contributor
}
