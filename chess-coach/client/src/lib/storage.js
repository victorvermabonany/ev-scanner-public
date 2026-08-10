// Everything the app remembers between visits, in one place.
//
// localStorage only — there's no backend, and none of this is worth more
// than the device it's on.

const KEYS = {
  coach: 'chesscoach.coach',
  username: 'chesscoach.username',
  // Bumped when the summary's shape changes, so an older cached copy is
  // ignored rather than read with fields that aren't there. v2 added drills.
  summary: 'chesscoach.summary.v2',
  completed: 'chesscoach.completedDrills',
};

// Analysing a week of games takes real time on a phone, so the result is
// cached and only recomputed when it's stale or the player asks.
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // private mode, storage disabled, etc.
  }
}

function write(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* not fatal — the app just won't remember */
  }
}

export const loadCoach = () => read(KEYS.coach);
export const saveCoach = (coach) => write(KEYS.coach, coach);

export const loadUsername = () => read(KEYS.username);
export const saveUsername = (name) => write(KEYS.username, name);

/** Cached weekly summary, if it's for this player and still fresh. */
export function loadSummary(username) {
  const raw = read(KEYS.summary);
  if (!raw) return null;
  try {
    const { username: cachedFor, savedAt, summary } = JSON.parse(raw);
    if (cachedFor?.toLowerCase() !== username.toLowerCase()) return null;
    if (Date.now() - savedAt > CACHE_MAX_AGE_MS) return null;
    return summary;
  } catch {
    return null;
  }
}

export function saveSummary(username, summary) {
  write(KEYS.summary, JSON.stringify({ username, savedAt: Date.now(), summary }));
}

/** Drill ids the player has attempted. Survives re-analysis. */
export function loadCompleted() {
  try {
    const parsed = JSON.parse(read(KEYS.completed) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function markCompleted(id) {
  const all = loadCompleted();
  if (!all.includes(id)) write(KEYS.completed, JSON.stringify([...all, id]));
}

export function clearAll() {
  for (const key of Object.values(KEYS)) write(key, null);
}
