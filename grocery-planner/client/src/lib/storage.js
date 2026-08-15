// Everything the app remembers between visits.
//
// localStorage only. There is no backend, so a person's plans never leave
// their own browser — which is honest but has one real consequence: an
// "account" here is a profile on this device, not a login. Signing in on a
// phone will not show plans saved on a laptop, and the account screen says so
// rather than implying otherwise.
//
// Data is namespaced per account so two people sharing a browser don't
// overwrite each other, and the device separately remembers who is signed in.

const DEVICE = {
  activeUser: 'groceryplanner.activeUser',
  accounts: 'groceryplanner.accounts',
  apiKey: 'groceryplanner.apiKey',
  model: 'groceryplanner.model',
  draft: 'groceryplanner.draft',
  lastVisit: 'groceryplanner.lastVisitDay',
};

// Bumped when the plan shape changes, so an older saved plan is ignored rather
// than rendered with fields that aren't there.
const PLAN_SCHEMA = 'v1';

const key = (email, name) =>
  `groceryplanner.u.${String(email).toLowerCase()}.${name}`;

function read(name) {
  try {
    return window.localStorage.getItem(name);
  } catch {
    return null; // private mode, storage disabled, quota
  }
}

function write(name, value) {
  try {
    if (value === null) window.localStorage.removeItem(name);
    else window.localStorage.setItem(name, value);
    return true;
  } catch {
    return false; // not fatal — the app just won't remember
  }
}

function readJson(name, fallback) {
  const raw = read(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const writeJson = (name, value) => write(name, JSON.stringify(value));

// ------------------------------------------------------------- accounts

export const listAccounts = () => {
  const list = readJson(DEVICE.accounts, []);
  return Array.isArray(list) ? list : [];
};

export const loadActiveUser = () => readJson(DEVICE.activeUser, null);

/** Sign in (or create) a local profile. No password: nothing here is secret. */
export function signIn({ email, name }) {
  const account = { email: email.trim().toLowerCase(), name: name.trim() || email.split('@')[0] };
  const others = listAccounts().filter((entry) => entry.email !== account.email);
  writeJson(DEVICE.accounts, [account, ...others]);
  writeJson(DEVICE.activeUser, account);
  return account;
}

/** Leaves the profile's plans intact, so switching back is instant. */
export const signOut = () => write(DEVICE.activeUser, null);

export function forgetAccount(email) {
  for (const name of ['plans', 'preferences']) write(key(email, name), null);
  writeJson(DEVICE.accounts, listAccounts().filter((entry) => entry.email !== email));
  if (loadActiveUser()?.email === email) signOut();
}

// ---------------------------------------------------------- preferences

const EMPTY_PREFERENCES = {
  zip: '',
  storeId: null,
  people: 2,
  mealCount: 5,
  budget: 100,
  leftovers: 'none',
  nutritionStyle: 'balanced',
  maxCookMinutes: 45,
  diets: [],
  allergies: [],
  dislikes: '',
  cuisines: [],
  pantryKeys: [],
  customInstructions: '',
};

export function loadPreferences(email) {
  if (!email) return { ...EMPTY_PREFERENCES };
  return { ...EMPTY_PREFERENCES, ...readJson(key(email, 'preferences'), {}) };
}

export const savePreferences = (email, preferences) =>
  email ? writeJson(key(email, 'preferences'), preferences) : false;

export { EMPTY_PREFERENCES };

// ---------------------------------------------------------------- plans

/**
 * Saved plans, newest first.
 *
 * Plans are stored whole rather than regenerated on open: reopening last
 * week's list must never depend on the model, the network, or today's prices
 * (PRD §23). The snapshot is what the person actually shopped from.
 */
export function loadPlans(email) {
  if (!email) return [];
  const stored = readJson(key(email, 'plans'), []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((entry) => entry.schema === PLAN_SCHEMA).map((entry) => entry.plan);
}

export function savePlan(email, plan) {
  if (!email) return false;
  const existing = loadPlans(email).filter((saved) => saved.id !== plan.id);
  // Ten is plenty of history and keeps well inside the storage quota.
  const plans = [plan, ...existing].slice(0, 10);
  const ok = writeJson(
    key(email, 'plans'),
    plans.map((entry) => ({ schema: PLAN_SCHEMA, plan: entry }))
  );
  if (!ok && plans.length > 1) {
    // Out of room: keep the newest rather than losing everything.
    return writeJson(key(email, 'plans'), [{ schema: PLAN_SCHEMA, plan }]);
  }
  return ok;
}

export function deletePlan(email, planId) {
  if (!email) return false;
  const plans = loadPlans(email).filter((plan) => plan.id !== planId);
  return writeJson(
    key(email, 'plans'),
    plans.map((entry) => ({ schema: PLAN_SCHEMA, plan: entry }))
  );
}

// --------------------------------------------------------------- device

/**
 * The questionnaire in progress.
 *
 * Kept on the device, not the account, and written on every step — a failed
 * generation, a closed tab or an expired session must not cost someone their
 * answers (PRD §23).
 */
export const loadDraft = () => readJson(DEVICE.draft, null);
export const saveDraft = (draft) => writeJson(DEVICE.draft, draft);
export const clearDraft = () => write(DEVICE.draft, null);

/**
 * The Anthropic API key, if the visitor has supplied one.
 *
 * Device-local and never sent anywhere except api.anthropic.com. Without it
 * the app plans from its built-in recipe bank instead, which is a complete
 * experience rather than a locked door.
 */
export const loadApiKey = () => read(DEVICE.apiKey);
export const saveApiKey = (value) => write(DEVICE.apiKey, value || null);

export const loadModel = () => read(DEVICE.model) || 'claude-opus-5';
export const saveModel = (value) => write(DEVICE.model, value || null);

export { DEVICE as STORAGE_KEYS };
