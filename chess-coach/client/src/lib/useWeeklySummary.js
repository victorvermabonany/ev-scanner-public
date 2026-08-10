// Owns the "analyse this player's recent games" work.
//
// It lives here rather than in a screen because more than one screen needs
// the result, and analysing five games on a phone is far too expensive to
// repeat per screen.

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRecentGames, ChessComError } from '../../../shared/chesscom.js';
import { analyseGame } from '../../../shared/analysis.js';
import { summariseWeek } from '../../../shared/weekly.js';
import { BrowserEngine } from './engine.js';
import { loadSummary, saveSummary } from './storage.js';

const GAMES_TO_ANALYSE = 5;
const DEPTH = 10;

export function useWeeklySummary(username) {
  const [summary, setSummary] = useState(() => loadSummary(username));
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const engineRef = useRef(null);

  const run = useCallback(async () => {
    setError(null);
    setProgress({ stage: 'Fetching your games', detail: null, fraction: null });

    try {
      const games = (await fetchRecentGames(username, GAMES_TO_ANALYSE)).filter(
        (game) => game.rules === 'chess'
      );

      if (games.length === 0) {
        setSummary(summariseWeek([], { username }));
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
      for (const [index, game] of games.entries()) {
        entries.push({
          game,
          analysis: await analyseGame(game.pgn, {
            engine: engineRef.current,
            depth: DEPTH,
            // Report every position, not every game. A game can take half a
            // minute on a phone, and a bar that sits still that long reads
            // as broken.
            onProgress: (done, total) => {
              setProgress({
                stage: 'Analysing your games',
                detail: `Game ${index + 1} of ${games.length}`,
                fraction: (index + done / total) / games.length,
              });
            },
          }),
        });
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

      setSummary(next);
      saveSummary(username, next);
    } catch (err) {
      setError(
        err instanceof ChessComError ? err.message : err.message ?? 'Something went wrong.'
      );
    } finally {
      setProgress(null);
    }
  }, [username]);

  useEffect(() => {
    if (!summary) run();
    return () => engineRef.current?.quit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  return { summary, progress, error, refresh: run };
}
