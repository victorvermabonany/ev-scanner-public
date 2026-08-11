// The one piece of real logic in the app: turning a list of check-ins into
// "days of intention". Kept free of DOM and server concerns so both sides can
// run it, and so it can be tested on its own.

const DAY_MS = 24 * 60 * 60 * 1000;

/** The three answers. Order matters — it's the order they're offered in. */
export const MOODS = ['strong', 'struggling', 'slipped'];

/**
 * Today as YYYY-MM-DD in the *local* calendar. Not toISOString(), which is
 * UTC and would roll the day over at the wrong moment for most of the world.
 */
export function todayIso(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Whole days between two YYYY-MM-DD dates. Noon UTC dodges DST shifts. */
export function daysBetween(fromIso, toIso) {
  const at = (iso) => Date.parse(`${iso}T12:00:00Z`);
  return Math.round((at(toIso) - at(fromIso)) / DAY_MS);
}

/** YYYY-MM-DD, offset by a number of days. */
export function shiftIso(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Newest first, ignoring anything dated after today. */
export function sortedCheckIns(checkIns, today = todayIso()) {
  return checkIns
    .filter((entry) => isIsoDate(entry.date) && entry.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function checkInFor(checkIns, date) {
  return checkIns.find((entry) => entry.date === date) || null;
}

/**
 * Days of intention: the run of days since the last "slipped" check-in.
 *
 * Counted from the calendar, not from the check-ins — a day you forgot to
 * open the app is not a day you slipped, and having the number collapse over
 * a missed entry would make the app the thing you're keeping up with rather
 * than the intention. Only an explicit "slipped" resets it, and it resets to
 * zero on the day itself: slipping today means today is day zero, and
 * tomorrow starts the count again at one.
 *
 * With no slip on record the count runs from the first check-in, inclusive,
 * so a first "strong" reads as 1 rather than 0.
 */
export function daysOfIntention(checkIns, today = todayIso()) {
  const entries = sortedCheckIns(checkIns, today);
  if (entries.length === 0) return 0;

  const lastSlip = entries.find((entry) => entry.mood === 'slipped');
  if (lastSlip) return daysBetween(lastSlip.date, today);

  const first = entries[entries.length - 1];
  return daysBetween(first.date, today) + 1;
}

/**
 * The last N calendar days, oldest first, each with its check-in if there is
 * one. Drives the small row of days on the home screen.
 */
export function recentDays(checkIns, today = todayIso(), count = 7) {
  const entries = sortedCheckIns(checkIns, today);

  return Array.from({ length: count }, (_, index) => {
    const date = shiftIso(today, index - (count - 1));
    return { date, mood: checkInFor(entries, date)?.mood ?? null };
  });
}

/** Everything the two screens need, derived in one place. */
export function summarize(checkIns, today = todayIso()) {
  const entries = sortedCheckIns(checkIns, today);

  return {
    today,
    days: daysOfIntention(entries, today),
    todayMood: checkInFor(entries, today)?.mood ?? null,
    recent: recentDays(entries, today),
    total: entries.length,
    // Whether the count is measured from a slip or from the very first
    // check-in. The number is the same either way; what the screen can
    // honestly say about it is not.
    hasSlipped: entries.some((entry) => entry.mood === 'slipped'),
  };
}
