// A single 0-100 number for the week, so the ring has something to fill.
//
// Blunder count on its own can't drive a ring: it has no ceiling, and more of
// it is worse, whereas a fuller ring should mean a better week. This converts
// the blunder rate into a score where higher is better.
//
// The formula is deliberately simple enough to state in one line on screen:
// start at 100, lose 25 points for every blunder per game. So 0 blunders a
// game is 100, one a game is 75, two is 50, four or more bottoms out at 0.
//
// It is a made-up metric, not a rating — it exists to make "how was this
// week" glanceable, and it is only comparable against your own other weeks.

const PENALTY_PER_BLUNDER_PER_GAME = 25;

/** Bands for the traffic-light colouring, splitting 0-100 into thirds. */
export const BANDS = { low: 'low', mid: 'mid', high: 'high' };

export function bandFor(value) {
  if (value >= 67) return BANDS.high;
  if (value >= 34) return BANDS.mid;
  return BANDS.low;
}

export function weeklyScore(summary) {
  // No games means no score rather than a perfect one.
  if (!summary || summary.games === 0) {
    return { value: null, band: BANDS.mid, formula: 'No games analysed' };
  }

  const raw = 100 - PENALTY_PER_BLUNDER_PER_GAME * summary.blundersPerGame;
  const value = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    value,
    band: bandFor(value),
    formula: `100 − 25 × ${summary.blundersPerGame} blunders per game`,
  };
}

/**
 * Where a blunder category sits on the same red/amber/green scale, by how
 * much of the week's total it accounts for. Dominant categories read as
 * urgent; minor ones recede.
 */
export function categoryBand(count, total) {
  if (!total) return BANDS.high;
  const share = count / total;
  if (share >= 0.4) return BANDS.low; // dominant problem
  if (share >= 0.2) return BANDS.mid;
  return BANDS.high; // minor contributor
}
