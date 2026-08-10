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
    setProgress({ stage: 'Fetching your games', done: 0, total: 0 });

    try {
      const games = (await fetchRecentGames(username, GAMES_TO_ANALYSE)).filter(
        (game) => game.rules === 'chess'
      );

      if (games.length === 0) {
        setSummary(summariseWeek([], { username }));
        return;
      }

      if (!engineRef.current) {
        setProgress({ stage: 'Starting engine', done: 0, total: 0 });
        engineRef.current = new BrowserEngine({ depth: DEPTH });
        await engineRef.current.start();
      }

      const entries = [];
      for (const [index, game] of games.entries()) {
        setProgress({ stage: 'Analysing games', done: index, total: games.length });
        entries.push({
          game,
          analysis: await analyseGame(game.pgn, { engine: engineRef.current, depth: DEPTH }),
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
