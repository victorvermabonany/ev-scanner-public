// Everything the app remembers between visits.
//
// localStorage only — there's no backend, so a person's data never leaves
// their own browser and no visitor can ever see another's. What localStorage
// does NOT give you for free is more than one account on a single device:
// one set of keys means two people sharing a browser overwrite each other.
//
// So every piece of user data is namespaced by username, and the device
// separately remembers which profile is signed in. Signing out leaves that
// profile's data intact, so switching back doesn't mean re-onboarding and
// re-analysing from scratch.

const DEVICE = {
  activeUser: 'chesscoach.activeUser',
  profiles: 'chesscoach.profiles',
};

// Bumped when the summary's shape changes, so an older cached copy is
// ignored rather than read with fields that aren't there. v2 added drills,
// v3 per-game rows, v4 full move reviews, v5 labels/evals/arrows.
const SUMMARY_VERSION = 'v5';

/** Usernames are case-insensitive on Chess.com, so keys are lowercased. */
const profileKey = (username, name) =>
  `chesscoach.u.${String(username).toLowerCase()}.${name}`;

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

function readJson(key, fallback) {
  const raw = read(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// ------------------------------------------------------------- profiles

/** Every account set up on this device, most recently used first. */
export function listProfiles() {
  const list = readJson(DEVICE.profiles, []);
  return Array.isArray(list) ? list : [];
}

function rememberProfile(username) {
  const others = listProfiles().filter(
    (name) => name.toLowerCase() !== username.toLowerCase()
  );
  write(DEVICE.profiles, JSON.stringify([username, ...others]));
}

/** Who is signed in on this device right now. */
export const loadActiveUser = () => read(DEVICE.activeUser);

export function signIn(username) {
  write(DEVICE.activeUser, username);
  rememberProfile(username);
}

/** Signs out but keeps the profile, so switching back is instant. */
export function signOut() {
  write(DEVICE.activeUser, null);
}

/** Removes a profile and everything belonging to it. */
export function forgetProfile(username) {
  for (const name of ['coach', `summary.${SUMMARY_VERSION}`, 'completedDrills']) {
    write(profileKey(username, name), null);
  }
  write(
    DEVICE.profiles,
    JSON.stringify(
      listProfiles().filter((name) => name.toLowerCase() !== username.toLowerCase())
    )
  );
  if (loadActiveUser()?.toLowerCase() === username.toLowerCase()) signOut();
}

// --------------------------------------------------------- per-profile

export const loadCoach = (username) =>
  username ? read(profileKey(username, 'coach')) : null;

export const saveCoach = (username, coach) =>
  write(profileKey(username, 'coach'), coach);

/** Cached weekly summary for this profile, if it's still fresh. */
export function loadSummary(username) {
  if (!username) return null;
  const stored = readJson(profileKey(username, `summary.${SUMMARY_VERSION}`), null);
  if (!stored) return null;
  if (Date.now() - stored.savedAt > CACHE_MAX_AGE_MS) return null;
  return stored.summary;
}

export function saveSummary(username, summary) {
  write(
    profileKey(username, `summary.${SUMMARY_VERSION}`),
    JSON.stringify({ savedAt: Date.now(), summary })
  );
}

/** Drill ids this profile has attempted. */
export function loadCompleted(username) {
  if (!username) return [];
  const list = readJson(profileKey(username, 'completedDrills'), []);
  return Array.isArray(list) ? list : [];
}

export function markCompleted(username, id) {
  const all = loadCompleted(username);
  if (!all.includes(id)) {
    write(profileKey(username, 'completedDrills'), JSON.stringify([...all, id]));
  }
}

// --------------------------------------------------------------- legacy

/**
 * Move a pre-namespacing setup into its own profile, so an existing user
 * stays signed in rather than being dumped back at onboarding by an upgrade.
 */
export function migrateLegacyProfile() {
  const username = read('chesscoach.username');
  if (!username) return;

  const coach = read('chesscoach.coach');
  if (coach) saveCoach(username, coach);

  const summary = read(`chesscoach.summary.${SUMMARY_VERSION}`);
  if (summary) write(profileKey(username, `summary.${SUMMARY_VERSION}`), summary);

  const completed = read('chesscoach.completedDrills');
  if (completed) write(profileKey(username, 'completedDrills'), completed);

  signIn(username);

  for (const key of [
    'chesscoach.username',
    'chesscoach.coach',
    `chesscoach.summary.${SUMMARY_VERSION}`,
    'chesscoach.completedDrills',
  ]) {
    write(key, null);
  }
}
