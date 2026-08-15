// The funnel events from PRD §24, and nothing else.
//
// Off by default: nothing is loaded and nothing is sent until a domain is
// configured, so the app makes no third-party requests unless that's a
// deliberate choice.
//
//     VITE_ANALYTICS_DOMAIN=example.com npm run build:pages
//
// What is deliberately NOT sent: allergies, dietary restrictions, dislikes,
// ZIP codes, email addresses, or anything else about a person's health or
// household. PRD §24 asks for this explicitly, and it is enforced here rather
// than trusted to call sites: `track` only forwards the props named in
// ALLOWED_PROPS, so a future caller cannot leak an allergy list by accident.

const DOMAIN = import.meta.env?.VITE_ANALYTICS_DOMAIN ?? '';
const SCRIPT_URL = 'https://plausible.io/js/script.js';

// Coarse, non-identifying dimensions. Everything else is dropped.
const ALLOWED_PROPS = new Set([
  'step',
  'source',
  'reason',
  'mealCount',
  'people',
  'budgetBand',
  'store',
  'withinBudget',
  'since',
]);

export const EVENTS = {
  landingViewed: 'Landing viewed',
  plannerStarted: 'Planner started',
  plannerStep: 'Planner step completed',
  plannerAbandoned: 'Planner abandoned',
  generationStarted: 'Plan generation started',
  generationSucceeded: 'Plan generation succeeded',
  generationFailed: 'Plan generation failed',
  groceryListOpened: 'Grocery list opened',
  mealOpened: 'Meal opened',
  mealSwapped: 'Meal swapped',
  planRegenerated: 'Plan regenerated',
  pantryMarked: 'Pantry item marked as owned',
  itemChecked: 'Grocery item checked',
  planSaved: 'Plan saved',
  accountCreated: 'Account created',
  returned: 'Returned to create another plan',
};

const enabled = () => Boolean(DOMAIN) && typeof window !== 'undefined';

let loaded = false;

function load() {
  if (loaded || !enabled()) return;
  loaded = true;

  // Queue stub, so events fired before the script arrives — or while it's
  // blocked by an ad blocker, which is common — are swallowed rather than
  // throwing.
  window.plausible =
    window.plausible ||
    function stub(...args) {
      (window.plausible.q = window.plausible.q || []).push(args);
    };

  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = DOMAIN;
  script.src = SCRIPT_URL;
  document.head.appendChild(script);
}

/** Budgets as bands, so spending never becomes a per-person data point. */
export const budgetBand = (amount) =>
  amount < 60 ? 'under-60' : amount < 100 ? '60-99' : amount < 150 ? '100-149' : '150-plus';

/** Record an event. A no-op when analytics is switched off. */
export function track(event, props) {
  if (!enabled()) return;
  load();

  const safe = {};
  for (const [name, value] of Object.entries(props ?? {})) {
    if (ALLOWED_PROPS.has(name)) safe[name] = String(value);
  }

  try {
    window.plausible(event, Object.keys(safe).length > 0 ? { props: safe } : undefined);
  } catch {
    /* analytics must never break the app */
  }
}

/**
 * Fire a return-visit event when someone comes back on a later day.
 *
 * Stores one date string locally rather than using a cookie or an ID — enough
 * to answer "did this browser come back within two weeks", which is the V1
 * retention metric, and nothing more.
 */
export function trackVisit() {
  load();

  const today = new Date().toISOString().slice(0, 10);
  let previous = null;
  try {
    previous = window.localStorage.getItem('groceryplanner.lastVisitDay');
    window.localStorage.setItem('groceryplanner.lastVisitDay', today);
  } catch {
    /* storage unavailable — count it as a first visit */
  }

  if (previous && previous !== today) {
    const days = Math.round((Date.parse(today) - Date.parse(previous)) / 86_400_000);
    track(EVENTS.returned, {
      since: days <= 7 ? 'within a week' : days <= 14 ? 'within two weeks' : 'over two weeks',
    });
  }
}
