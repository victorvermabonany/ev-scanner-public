// Turns a thrown error into something a person can act on.
//
// The rule here: say what happened, and say what to do next. "Failed to
// fetch" tells a user nothing they can use.

import { ChessComError } from '../../../shared/chesscom.js';

export function describeFailure(error, { username } = {}) {
  // Check the browser's own view first — it's more reliable than guessing
  // from the error, and being offline explains almost anything.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      title: "You're offline",
      message:
        'Chess Coach needs a connection to fetch your games. Reconnect and try again — the engine itself runs on your device.',
      retry: true,
    };
  }

  if (error instanceof ChessComError) {
    if (error.status === 404) {
      return {
        title: "We can't find that account",
        message: `Chess.com no longer returns anything for "${username ?? 'that username'}". If you renamed your account, switch player and enter the new one.`,
        retry: true,
        switchPlayer: true,
      };
    }

    if (error.status === 429) {
      return {
        title: 'Chess.com is rate-limiting us',
        message:
          'Too many requests went out in a short window. Wait a minute or two, then try again — nothing is wrong with your account.',
        retry: true,
      };
    }

    if (error.status === 503) {
      return {
        title: "Couldn't reach Chess.com",
        message:
          'The request never got through. A VPN, a content blocker, or a dropped connection will all do this. Check those and try again.',
        retry: true,
      };
    }

    // Deliberately not error.message here: it carries the request URL, which
    // is noise to a user reading an error screen.
    return {
      title: 'Chess.com returned an error',
      message: `Their API responded with ${error.status}. That's on their side and usually temporary — try again shortly.`,
      retry: true,
    };
  }

  const text = String(error?.message ?? '');

  if (/stockfish|engine|worker/i.test(text)) {
    return {
      title: "The chess engine didn't start",
      message:
        'The engine is a 7 MB download that runs in your browser. Low memory, private browsing, or a blocked download can stop it. Reload the page and try again.',
      retry: true,
    };
  }

  if (/quota|storage/i.test(text)) {
    return {
      title: 'No room to save your analysis',
      message:
        "Your browser's storage is full. Clearing site data for this page will fix it — you'll only need to re-enter your username.",
      retry: true,
    };
  }

  return {
    title: 'Something went wrong',
    message: `${text || 'An unexpected error stopped the analysis.'} Try again, and if it keeps happening, switch player and set up again.`,
    retry: true,
    switchPlayer: true,
  };
}
