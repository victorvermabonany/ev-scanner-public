import { COACHES, writeReport } from '../../../shared/coach.js';
import { CATEGORY_LABELS } from '../../../shared/classify.js';
import { CoachMark } from '../components/CoachMark.jsx';

export default function Report({ coach, summary, onBack }) {
  const report = writeReport(coach, summary);

  // Biggest problem first — the ordering is the point of the breakdown.
  const rows = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]);
  const largest = rows.length ? rows[0][1] : 0;

  return (
    <main className="screen report-screen">
      <header className="rep__head">
        <button className="linkbtn" onClick={onBack}>
          ← Back
        </button>
        <span className="rep__period">
          {summary.from} – {summary.to}
        </span>
      </header>

      <div className="rep__coach">
        <CoachMark coach={coach} size={40} />
        <div>
          <p className="rep__coachname">{COACHES[coach]}</p>
          <p className="rep__meta">
            {summary.games === 1 ? '1 game' : `${summary.games} games`} ·{' '}
            {summary.blunders === 1 ? '1 blunder' : `${summary.blunders} blunders`}
          </p>
        </div>
      </div>

      <p className="rep__text">{report}</p>

      <section className="breakdown">
        <h2 className="rep__h2">Where they came from</h2>

        {rows.length === 0 ? (
          <p className="rep__empty">No blunders to break down.</p>
        ) : (
          <ul className="bars">
            {rows.map(([category, count]) => (
              <li key={category} className="bar">
                <div className="bar__top">
                  <span className="bar__label">{CATEGORY_LABELS[category]}</span>
                  <span className="bar__count">{count}</span>
                </div>
                <div className="bar__track">
                  <div
                    className={`bar__fill bar__fill--${category}`}
                    style={{ width: `${largest ? (count / largest) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {summary.worstGame?.blunders > 0 && (
        <p className="rep__worst">
          Worst game:{' '}
          <a href={summary.worstGame.url} target="_blank" rel="noreferrer">
            vs {summary.worstGame.opponent}
          </a>{' '}
          — {summary.worstGame.blunders}{' '}
          {summary.worstGame.blunders === 1 ? 'blunder' : 'blunders'}
        </p>
      )}

      <footer className="footer">build {__BUILD_TIME__}</footer>
    </main>
  );
}
