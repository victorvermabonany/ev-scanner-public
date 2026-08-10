import { COACHES, writeHeadline } from '../../../shared/coach.js';
import { weeklyScore } from '../../../shared/score.js';
import { CoachMark } from '../components/CoachMark.jsx';
import { Ring } from '../components/Ring.jsx';

/** Result as it would appear on a scoresheet, from the player's side. */
function scoreline(game) {
  if (game.outcome === 'win') return '1–0';
  if (game.outcome === 'loss') return '0–1';
  if (game.outcome === 'draw') return '½–½';
  return '·';
}

export default function Home({
  coach,
  summary,
  onChangeCoach,
  onOpenReport,
  onOpenDrills,
  onOpenGames,
  onOpenGame,
  onRefresh,
}) {
  const headline = writeHeadline(coach, summary);
  const score = weeklyScore(summary);
  const periodLabel = summary.widened ? `Last ${summary.games} games` : 'This week';
  const games = summary.perGame ?? [];

  return (
    <main className="screen home">
      <header className="home__head">
        <button className="home__coach" onClick={onChangeCoach}>
          <CoachMark coach={coach} size={34} />
          <span className="home__coachname">{COACHES[coach]}</span>
        </button>
        <span className="home__user">{summary.username}</span>
      </header>

      <section className="score">
        <p className="eyebrow score__label">{periodLabel}</p>

        <div className="score__ring">
          <Ring value={score.value} band={score.band}>
            <span className={`ring__value ring__value--${score.band}`}>
              {score.value ?? '—'}
            </span>
            <span className="ring__caption">
              {summary.blunders} {summary.blunders === 1 ? 'blunder' : 'blunders'} ·{' '}
              {summary.games === 1 ? '1 game' : `${summary.games} games`}
            </span>
          </Ring>
        </div>

        {/* Dense stat block: small-caps labels, bold figures, tight rhythm. */}
        <dl className="stats">
          <div className="stats__cell">
            <dt>Per game</dt>
            <dd>{summary.blundersPerGame}</dd>
          </div>
          <div className="stats__cell">
            <dt>Clean</dt>
            <dd>
              {summary.cleanGames}
              <span className="stats__of">/{summary.games}</span>
            </dd>
          </div>
          <div className="stats__cell">
            <dt>Record</dt>
            <dd>
              {summary.record.win}–{summary.record.loss}–{summary.record.draw}
            </dd>
          </div>
        </dl>

        {/* Per-game notation strip: one ruled column per game, oldest first. */}
        {games.length > 0 && (
          <div className="strip">
            {games.map((game, index) => (
              <button
                key={game.url ?? index}
                className="strip__cell"
                onClick={() => onOpenGame(index)}
              >
                <span className="strip__no">{index + 1}</span>
                <span
                  className={`strip__result ${
                    game.outcome === 'win' ? 'strip__result--win' : ''
                  }`}
                >
                  {scoreline(game)}
                </span>
                <span className="strip__marks">
                  {game.blunders === 0 ? (
                    <i className="mark mark--clean" />
                  ) : (
                    Array.from({ length: Math.min(game.blunders, 4) }, (_, i) => (
                      <i key={i} className="mark" />
                    ))
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="insight">
        <p className="insight__kicker">
          {summary.topCategoryLabel ? `Focus · ${summary.topCategoryLabel}` : 'Nothing to fix'}
        </p>
        <p className="insight__line">{headline}</p>
      </section>

      <div className="home__actions">
        <button className="linkbtn" onClick={onOpenReport}>
          Report
        </button>
        <button className="linkbtn" onClick={onOpenGames}>
          Games
        </button>
        <button className="linkbtn" onClick={onOpenDrills}>
          Drills
        </button>
        <button className="linkbtn" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <footer className="footer">build {__BUILD_TIME__}</footer>
    </main>
  );
}
