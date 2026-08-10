import { useState } from 'react';
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
  onSwitchPlayer,
}) {
  const [showSwitch, setShowSwitch] = useState(false);
  const headline = writeHeadline(coach, summary);
  const score = weeklyScore(summary);
  const periodLabel = summary.widened ? `Last ${summary.games} games` : 'This week';
  const games = summary.perGame ?? [];

  // Nothing to show yet. A ring reading "—" over 0/0 stats looks broken;
  // this says what's missing and what to do about it.
  if (summary.games === 0) {
    return (
      <main className="screen home empty">
        <header className="home__head">
          <button className="home__coach" onClick={onChangeCoach}>
            <CoachMark coach={coach} size={34} />
            <span className="home__coachname">{COACHES[coach]}</span>
          </button>
          <button className="home__user" onClick={() => setShowSwitch((v) => !v)}>
            {summary.username}
          </button>
        </header>

        {showSwitch && (
          <div className="switcher">
            <span className="switcher__text">Signed in as {summary.username}</span>
            <button className="linkbtn" onClick={onSwitchPlayer}>
              Switch player
            </button>
          </div>
        )}

        <section className="emptystate">
          <h1 className="emptystate__title">Nothing to review yet</h1>

          <p className="emptystate__body">
            {summary.emptyReason === 'variants-only'
              ? `We found ${summary.variantCount} recent game${summary.variantCount === 1 ? '' : 's'} on ${summary.username}, but they're all variants. Chess Coach reviews standard chess for now — play a standard game and it'll appear here.`
              : `We're connected to ${summary.username}, but there are no games to review yet. Play a game on Chess.com and your last few will be analysed automatically.`}
          </p>

          <p className="emptystate__coach">{headline}</p>

          <div className="emptystate__actions">
            <button className="btn" onClick={onRefresh}>
              Check again
            </button>
            <button className="linkbtn" onClick={onSwitchPlayer}>
              Wrong account?
            </button>
          </div>
        </section>

        <footer className="footer">build {__BUILD_TIME__}</footer>
      </main>
    );
  }

  return (
    <main className="screen home">
      <header className="home__head">
        <button className="home__coach" onClick={onChangeCoach}>
          <CoachMark coach={coach} size={34} />
          <span className="home__coachname">{COACHES[coach]}</span>
        </button>
        {/* The only route back out to a different account. */}
        <button className="home__user" onClick={() => setShowSwitch((v) => !v)}>
          {summary.username}
        </button>
      </header>

      {showSwitch && (
        <div className="switcher">
          <span className="switcher__text">Signed in as {summary.username}</span>
          <button className="linkbtn" onClick={onSwitchPlayer}>
            Switch player
          </button>
        </div>
      )}

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
