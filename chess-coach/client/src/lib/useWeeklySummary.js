// Owns the "analyse this player's recent games" work.
//
// It lives here rather than in a screen because more than one screen needs
// the result, and analysing five games on a phone is far too expensive to
// repeat per screen.

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRecentGames } from '../../../shared/chesscom.js';
import { describeFailure } from './describeFailure.js';
import { track } from './analytics.js';
import { analyseGame } from '../../../shared/analysis.js';
import { summariseWeek } from '../../../shared/weekly.js';
import { BrowserEngine } from './engine.js';
import { loadMsPerGame, loadSummary, saveMsPerGame, saveSummary } from './storage.js';

// Deliberately the smallest option: the default run should be fast, and
// deeper history is something a user opts into.
export const GAME_COUNT_OPTIONS = [5, 10, 20];
export const DEFAULT_GAME_COUNT = 5;
const DEPTH = 10;

export function useWeeklySummary(username, gameCount = DEFAULT_GAME_COUNT) {
  const [summary, setSummary] = useState(() => loadSummary(username));
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const engineRef = useRef(null);

  // Identifies the current run. An analysis started for one account must not
  // write its result into another's screen if the user switches mid-way.
  const runIdRef = useRef(0);

  const run = useCallback(async (overrideCount) => {
    // Guard against being wired straight to onClick, which would pass an event.
    const count = typeof overrideCount === 'number' ? overrideCount : gameCount;
    const runId = ++runIdRef.current;
    const forUser = username;
    const isCurrent = () => runIdRef.current === runId;

    setError(null);
    track('Analysis started', { games: String(count) });
    setProgress({ stage: 'Fetching your games', detail: null, fraction: null });

    try {
      const startedAt = Date.now();
      const fetched = await fetchRecentGames(username, count);
      const games = fetched.filter((game) => game.rules === 'chess');

      if (games.length === 0) {
        // Deliberately not cached: the moment they play a game it should show
        // up, without them having to know a Refresh button exists.
        if (isCurrent()) {
          setSummary({
            ...summariseWeek([], { username: forUser }),
            emptyReason: fetched.length > 0 ? 'variants-only' : 'no-games',
            variantCount: fetched.length,
          });
        }
        return;
      }

      if (!engineRef.current) {
        setProgress({
          stage: 'Loading the engine',
          // Worth naming: it's a big download and it only happens once.
          detail: 'About 7 MB, first time only',
          fraction: null,
        });
        engineRef.current = new BrowserEngine({ depth: DEPTH });
        await engineRef.current.start();
      }

      const entries = [];
      let skipped = 0;

      for (const [index, game] of games.entries()) {
        // One unreadable game shouldn't cost the user the whole run, so each
        // is isolated and a failure just drops that game.
        try {
          entries.push({
            game,
            analysis: await analyseGame(game.pgn, {
            engine: engineRef.current,
            depth: DEPTH,
            // Report every position, not every game. A game can take half a
            // minute on a phone, and a bar that sits still that long reads
            // as broken.
            onProgress: (done, total) => {
                const fraction = (index + done / total) / games.length;
                const elapsed = Date.now() - startedAt;
                setProgress({
                  stage: 'Analysing your games',
                  detail: `Game ${index + 1} of ${games.length}`,
                  fraction,
                  // Extrapolated from this run's own pace, so it reflects
                  // the device rather than a guess. Withheld until there's
                  // enough of a sample to not be wildly wrong.
                  etaSeconds:
                    fraction > 0.05
                      ? Math.max(1, Math.round((elapsed * (1 - fraction)) / fraction / 1000))
                      : null,
                });
              },
            }),
          });
        } catch (gameError) {
          skipped += 1;
          console.warn('Skipped a game that could not be analysed:', game.url, gameError);
        }
      }

      if (entries.length === 0) {
        throw new Error(
          skipped > 0
            ? 'None of your recent games could be analysed.'
            : 'No games were available to analyse.'
        );
      }

      // Anchor to the most recent game: a strict "last 7 days from today"
      // window shows nothing at all if you haven't played this week, which
      // is a worse answer than "your most recent week of play".
      const latest = new Date(Math.max(...entries.map((e) => e.game.end_time * 1000)));
      let next = summariseWeek(entries, { username, now: latest, days: 7 });

      // If even that window is empty, widen it to cover the games we have
      // rather than showing a blank screen. The header says which it is.
      if (next.games === 0) {
        const oldest = Math.min(...entries.map((e) => e.game.end_time * 1000));
        const span = Math.max(1, Math.ceil((latest - oldest) / 86_400_000) + 1);
        next = { ...summariseWeek(entries, { username, now: latest, days: span }), widened: true };
      }

      // Remember the pace so the next run can be estimated before it starts.
      if (entries.length > 0) {
        saveMsPerGame((Date.now() - startedAt) / entries.length);
      }

      track('Analysis completed', {
        games: String(entries.length),
        skipped: skipped > 0 ? 'yes' : 'no',
      });

      next = { ...next, skippedGames: skipped, analysedCount: count };
      // Always persist under the account it was computed for, even if the
      // user has since switched away.
      saveSummary(forUser, next);
      if (isCurrent()) setSummary(next);
    } catch (err) {
      // A half-started engine will keep failing, so drop it and let a retry
      // build a fresh one.
      if (/engine|stockfish|worker/i.test(String(err?.message ?? ''))) {
        engineRef.current?.quit?.();
        engineRef.current = null;
      }
      const failure = describeFailure(err, { username: forUser });
      // The headline only — never the raw message, which can carry a URL.
      track('Analysis failed', { reason: failure.title });
      if (isCurrent()) setError(failure);
    } finally {
      if (isCurrent()) setProgress(null);
    }
  }, [username, gameCount]);

  // Switching account has to reset this state. Leaving it alone meant the
  // previous account's summary stayed on screen — and because it was still
  // truthy, no fresh analysis was ever kicked off for the new one.
  useEffect(() => {
    runIdRef.current += 1; // abandon anything in flight for the old account
    const cached = loadSummary(username);
    setSummary(cached);
    setError(null);
    setProgress(null);
    if (!cached && username) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // The engine is shared across accounts and only torn down on unmount;
  // killing it on every switch would strand any in-flight evaluation.
  useEffect(() => () => {
    engineRef.current?.quit();
    engineRef.current = null;
  }, []);

  return { summary, progress, error, refresh: run, msPerGame: loadMsPerGame() };
}
