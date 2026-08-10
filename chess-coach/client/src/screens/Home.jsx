import { COACHES, writeHeadline } from '../../../shared/coach.js';
import { CoachMark } from '../components/CoachMark.jsx';

export default function Home({ coach, summary, onChangeCoach, onOpenReport, onOpenDrills, onRefresh }) {
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
        <button className="linkbtn" onClick={onOpenReport}>
          Full report
        </button>
        <button className="linkbtn" onClick={onOpenDrills}>
          Drills →
        </button>
        <button className="linkbtn" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <footer className="footer">build {__BUILD_TIME__}</footer>
    </main>
  );
}
