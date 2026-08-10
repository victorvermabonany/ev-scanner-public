// Minimal, privacy-simple analytics.
//
// Off by default. Nothing is loaded and nothing is sent until a domain is
// configured, so the app stays free of third-party requests until that's a
// deliberate choice.
//
// To turn it on, set VITE_ANALYTICS_DOMAIN at build time, or just put your
// domain in DOMAIN below:
//
//     VITE_ANALYTICS_DOMAIN=example.com npm run build:pages
//
// Provider is Plausible. Switching to GoatCounter or Simple Analytics means
// changing SCRIPT_URL and the two lines in send() — everything else in the
// app calls track() and doesn't care.
//
// What is deliberately NOT sent: the Chess.com username, game URLs, or
// anything else that identifies a person. Only the event name and a couple
// of coarse buckets, which is all a drop-off funnel needs.

const DOMAIN = import.meta.env?.VITE_ANALYTICS_DOMAIN ?? '';
const SCRIPT_URL = 'https://plausible.io/js/script.js';

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

/** Record an event. A no-op when analytics is switched off. */
export function track(event, props) {
  if (!enabled()) return;
  load();
  try {
    window.plausible(event, props ? { props } : undefined);
  } catch {
    /* analytics must never break the app */
  }
}

const LAST_VISIT_KEY = 'chesscoach.lastVisitDay';

/**
 * Fire a return-visit event when someone comes back on a later day.
 *
 * Stores one date string locally rather than using a cookie or an ID — it
 * can tell "this browser was here on an earlier day" and nothing else, which
 * is exactly what the question needs and no more.
 */
export function trackVisit() {
  // Load here rather than lazily on the first custom event: the pageview is
  // what the script records by itself, and someone who bounces off the
  // welcome screen never fires a custom event at all.
  load();

  const today = new Date().toISOString().slice(0, 10);

  let previous = null;
  try {
    previous = window.localStorage.getItem(LAST_VISIT_KEY);
    window.localStorage.setItem(LAST_VISIT_KEY, today);
  } catch {
    /* storage unavailable — just count it as a first visit */
  }

  if (previous && previous !== today) {
    const days = Math.round(
      (Date.parse(today) - Date.parse(previous)) / 86_400_000
    );
    track('Returning visit', {
      // Bucketed, so this stays a trend rather than a fingerprint.
      since: days === 1 ? 'next day' : days <= 7 ? 'within a week' : 'over a week',
    });
  }
}
