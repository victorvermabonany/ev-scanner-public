// Bronze / Silver / Gold / Platinum / Diamond.
//
// The point of a tier rather than a score: blunder rate on its own says more
// about your rating than about you. A 900 and a 1900 both blundering twice a
// game are not playing equally well — the 1900 is having a bad week and the
// 900 is having a normal one. So the tier is a ratio, not a count: what you
// actually do, over what players around your rating actually do.
//
// EXPECTED is measured, not invented. See docs/baseline.md for the run: real
// Chess.com games, analysed by this same pipeline at the same depth with the
// same 2.5-pawn threshold, binned by the rating Chess.com reported for the
// player in that game. It is a modest sample and it is a snapshot of one
// slice of the site, so treat it as a calibration that can be re-measured,
// not as a constant of nature.

/**
 * Blunders per 100 of the player's own moves, by rating, from the measurement
 * run. Anchors are bin midpoints on a weighted straight-line fit; anything
 * between them is interpolated, and anything outside the ends is clamped
 * rather than extrapolated — the sample says nothing about 2400s and
 * pretending otherwise would be inventing numbers.
 *
 * Per 100 MOVES, not per game, even though per game is what the screen shows.
 * Stronger players' games run longer — 31 moves a side around 900, 41 around
 * 1900 in the sample — so a per-game baseline quietly charges you for playing
 * long games, and the per-game trend across rating came out as mostly noise
 * while the per-move one fits at R² 0.72. Per move is the rate that actually
 * tracks rating; multiplying it back out by your own game length gives a
 * per-game number to display.
 */
export const EXPECTED = [
  { rating: 300, per100: 10.0 },
  { rating: 500, per100: 9.2 },
  { rating: 700, per100: 8.4 },
  { rating: 900, per100: 7.6 },
  { rating: 1100, per100: 6.8 },
  { rating: 1300, per100: 5.9 },
  { rating: 1500, per100: 5.1 },
  { rating: 1700, per100: 4.3 },
  { rating: 1900, per100: 3.5 },
];

/** Used when a player's rating is unknown, so the tier still means something. */
const FALLBACK_RATING = 1100;

/** Player moves per game across the whole measurement sample. */
const FALLBACK_MOVES_PER_GAME = 32;

export const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

export const TIER_TEXT = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
};

/**
 * Tier boundaries, as a ratio of your blunder rate to the expected rate.
 * Lower is better, so the list runs best-first. `max` is the worst ratio that
 * still earns the tier.
 *
 * Typical for your rating lands in Gold — the middle rung of five — so the
 * ladder reads honestly: Gold is "normal for you", and Platinum upward has to
 * be earned against your own peers rather than against beginners.
 *
 * These were picked before the measured sample was scored through them.
 * Scoring all 81 sampled players afterwards spread them 16 / 21 / 25 / 19 /
 * 20 percent across the five rungs, with the median player at 0.94x, so the
 * even spread is a result rather than something fitted to.
 */
export const TIER_RANGES = [
  { tier: 'diamond', max: 0.55 },
  { tier: 'platinum', max: 0.75 },
  { tier: 'gold', max: 1.05 },
  { tier: 'silver', max: 1.4 },
  { tier: 'bronze', max: Infinity },
];

/** Ratio at the bottom of Bronze, so "progress through Bronze" has a floor. */
const BRONZE_FLOOR = 2.2;

/** Below this many games the sample is too thin to rank on. */
export const MIN_GAMES = 3;

/**
 * What a player at this rating typically gives away, per 100 of their own
 * moves. Piecewise-linear between the measured anchors, clamped at both ends.
 */
export function expectedPer100Moves(rating) {
  const r = Number.isFinite(rating) && rating > 0 ? rating : FALLBACK_RATING;
  const first = EXPECTED[0];
  const last = EXPECTED[EXPECTED.length - 1];
  if (r <= first.rating) return first.per100;
  if (r >= last.rating) return last.per100;

  for (let i = 1; i < EXPECTED.length; i += 1) {
    const a = EXPECTED[i - 1];
    const b = EXPECTED[i];
    if (r <= b.rating) {
      const t = (r - a.rating) / (b.rating - a.rating);
      return a.per100 + t * (b.per100 - a.per100);
    }
  }
  return last.per100;
}

/**
 * The same expectation converted to blunders per game, for a player whose
 * games run this long. This is the number the screen compares against, so it
 * has to be in the same unit as the one next to it.
 */
export function expectedBlundersPerGame(rating, movesPerGame = FALLBACK_MOVES_PER_GAME) {
  const length =
    Number.isFinite(movesPerGame) && movesPerGame > 0
      ? movesPerGame
      : FALLBACK_MOVES_PER_GAME;
  return (expectedPer100Moves(rating) * length) / 100;
}

/** How far through its own tier a ratio sits, 0-1, better end being 1. */
function progressWithin(tier, ratio) {
  const index = TIER_RANGES.findIndex((r) => r.tier === tier);
  const top = TIER_RANGES[index].max === Infinity ? BRONZE_FLOOR : TIER_RANGES[index].max;
  // Diamond has no better tier above it, so its floor is an arbitrary "twice
  // as clean as expected" rather than a boundary.
  const bottom = index === 0 ? 0.25 : TIER_RANGES[index - 1].max;
  const span = top - bottom;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (top - ratio) / span));
}

/**
 * Rank a period's play.
 *
 * @param {object} summary  what summariseWeek returned
 * @returns {{
 *   tier: string|null, label: string, ratio: number|null,
 *   actual: number, expected: number, rating: number|null,
 *   ratingKnown: boolean, pool: string|null, games: number,
 *   provisional: boolean, progress: number, nextTier: string|null,
 *   toNextTier: number|null
 * }}
 */
export function tierFor(summary) {
  const games = summary?.games ?? 0;
  const rating = Number.isFinite(summary?.rating) ? summary.rating : null;

  // `moves` counts the player's own moves, which is what the baseline is per
  // 100 of. A player whose games run long is expected to blunder more of them
  // in absolute terms, and shouldn't be marked down for it.
  const movesPerGame =
    games > 0 && Number.isFinite(summary?.moves) && summary.moves > 0
      ? summary.moves / games
      : null;
  const expected = expectedBlundersPerGame(rating, movesPerGame);

  if (games < MIN_GAMES) {
    return {
      tier: null,
      label: 'Unranked',
      ratio: null,
      actual: summary?.blundersPerGame ?? 0,
      expected: Number(expected.toFixed(2)),
      rating,
      ratingKnown: rating != null,
      pool: summary?.ratingPool ?? null,
      games,
      provisional: true,
      progress: 0,
      nextTier: null,
      toNextTier: null,
    };
  }

  const actual = summary.blundersPerGame ?? 0;
  const ratio = actual / expected;
  const { tier } = TIER_RANGES.find((r) => ratio <= r.max);
  const index = TIERS.indexOf(tier);
  const nextTier = index < TIERS.length - 1 ? TIERS[index + 1] : null;

  // What the blunder rate would have to come down to for the next rung up.
  const nextMax = nextTier
    ? TIER_RANGES.find((r) => r.tier === nextTier).max
    : null;

  return {
    tier,
    label: TIER_TEXT[tier],
    ratio: Number(ratio.toFixed(2)),
    actual,
    expected: Number(expected.toFixed(2)),
    rating,
    ratingKnown: rating != null,
    pool: summary.ratingPool ?? null,
    games,
    movesPerGame: movesPerGame == null ? null : Math.round(movesPerGame),
    // Five games is a small sample for a rate; the tier is still shown, but
    // the screen says how many it came from rather than implying certainty.
    provisional: games < 5,
    progress: progressWithin(tier, ratio),
    nextTier,
    // Rounded DOWN to the one decimal it is displayed at, not to nearest:
    // this number is shown on screen as the rate to beat, and rounding it up
    // would print a target that still leaves you in the tier below when you
    // hit it exactly.
    toNextTier: nextMax == null ? null : Math.floor(nextMax * expected * 10) / 10,
  };
}
