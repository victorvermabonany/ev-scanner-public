import { useEffect, useRef, useState } from 'react';
import { fetchRecentGames, ChessComError } from '../../../shared/chesscom.js';
import { analyseGame } from '../../../shared/analysis.js';
import { summariseWeek } from '../../../shared/weekly.js';
import { COACHES, writeHeadline, writeReport } from '../../../shared/coach.js';
import { BrowserEngine } from '../lib/engine.js';
import { loadSummary, saveSummary } from '../lib/storage.js';
import { CoachMark } from '../components/CoachMark.jsx';

// Analysis runs on the phone, so this is a balance between a useful sample
// and a wait nobody will sit through. The result is cached either way.
const GAMES_TO_ANALYSE = 5;
const DEPTH = 10;

export default function Home({ coach, username, onChangeCoach }) {
  const [summary, setSummary] = useState(() => loadSummary(username));
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const engineRef = useRef(null);

  async function run() {
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
  }

  useEffect(() => {
    if (!summary) run();
    return () => engineRef.current?.quit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  if (progress) {
    return (
      <main className="screen screen--center">
        <CoachMark coach={coach} size={56} />
        <p className="loading__stage">{progress.stage}</p>
        {progress.total > 0 && (
          <p className="loading__count">
            {progress.done} of {progress.total}
          </p>
        )}
        <div className="progress__track">
          <div
            className="progress__bar"
            style={{
              width: progress.total
                ? `${(progress.done / progress.total) * 100}%`
                : '20%',
            }}
          />
        </div>
        <p className="loading__note">Running Stockfish on your device.</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="screen screen--center">
        <p className="error">{error}</p>
        <button className="btn" onClick={run}>
          Try again
        </button>
      </main>
    );
  }

  if (!summary) return <main className="screen" />;

  const headline = writeHeadline(coach, summary);
  const periodLabel = summary.widened ? `Last ${summary.games} games` : 'This week';

  return (
    <main className="screen home">
      <header className="home__head">
        <button className="home__coach" onClick={onChangeCoach}>
          <CoachMark coach={coach} size={40} />
          <span className="home__coachname">{COACHES[coach]}</span>
        </button>
        <span className="home__user">{summary.username}</span>
      </header>

      <section className="score">
        <p className="score__label">{periodLabel}</p>
        <p className="score__value">{summary.blunders}</p>
        <p className="score__unit">
          {summary.blunders === 1 ? 'blunder' : 'blunders'} in{' '}
          {summary.games === 1 ? '1 game' : `${summary.games} games`}
        </p>
        <dl className="score__row">
          <div>
            <dt>Per game</dt>
            <dd>{summary.blundersPerGame}</dd>
          </div>
          <div>
            <dt>Clean</dt>
            <dd>
              {summary.cleanGames}/{summary.games}
            </dd>
          </div>
          <div>
            <dt>Record</dt>
            <dd>
              {summary.record.win}–{summary.record.loss}–{summary.record.draw}
            </dd>
          </div>
        </dl>
      </section>

      <section className="insight">
        <p className="insight__kicker">
          {summary.topCategoryLabel ? `Focus: ${summary.topCategoryLabel}` : 'Nothing to fix'}
        </p>
        <p className="insight__line">{headline}</p>
      </section>

      <div className="home__actions">
        <button className="linkbtn" onClick={() => setShowReport((v) => !v)}>
          {showReport ? 'Hide report' : 'Full report'}
        </button>
        <button className="linkbtn" onClick={run}>
          Refresh
        </button>
      </div>

      {showReport && <p className="report">{writeReport(coach, summary)}</p>}

      <footer className="footer">build {__BUILD_TIME__}</footer>
    </main>
  );
}
