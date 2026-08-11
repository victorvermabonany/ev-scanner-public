import { useState } from 'react';
import { COACHES, writeHeadline } from '../../../shared/coach.js';
import { MIN_GAMES, TIER_TEXT, tierFor } from '../../../shared/tier.js';
import { GAME_COUNT_OPTIONS } from '../lib/useWeeklySummary.js';
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
  gameCount,
  msPerGame,
  onChangeGameCount,
}) {
  const [showSwitch, setShowSwitch] = useState(false);
  const [showDepth, setShowDepth] = useState(false);

  // Only once a run has been timed on this device can an estimate be honest.
  const estimate = (count) => {
    if (!msPerGame) return null;
    const seconds = Math.round((msPerGame * count) / 1000);
    return seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)} min`;
  };
  const headline = writeHeadline(coach, summary);
  const rank = tierFor(summary);
  const periodLabel = summary.widened ? `Last ${summary.games} games` : 'This week';
  // The strip is a glanceable scoresheet, not a full log — past about eight
  // columns the cells squeeze until the results wrap and the last ones run
  // off the screen. Everything analysed is still on the Games screen.
  const STRIP_MAX = 8;
  const allGames = summary.perGame ?? [];
  const games = allGames.slice(-STRIP_MAX);

  // Nothing to show yet. A tier over 0/0 stats looks broken;
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

      <section className="rank">
        <p className="eyebrow rank__label">{periodLabel}</p>

        {/* The tier is the headline. The ring behind it fills toward the next
            rung, so it shows movement without being a number in its own
            right — which is what the 0-100 weekly score used to be. */}
        <div className="rank__ring">
          <Ring value={rank.progress * 100} band={rank.tier ?? 'unranked'}>
            <span className={`tiername tiername--${rank.tier ?? 'unranked'}`}>
              {rank.label}
            </span>
            <span className="ring__caption">
              {summary.blunders} {summary.blunders === 1 ? 'blunder' : 'blunders'} ·{' '}
              {summary.games === 1 ? '1 game' : `${summary.games} games`}
            </span>
          </Ring>
        </div>

        {/* Say what the tier is measured against. A rank nobody can check is
            just a badge. */}
        <p className="tierwhy">
          {rank.tier == null ? (
            <>
              Needs {MIN_GAMES} games to rank — {rank.games}{' '}
              {rank.games === 1 ? 'game' : 'games'} so far.
            </>
          ) : (
            <>
              {/* Always one decimal: these are rates, so "1 blunders a game"
                  is both wrong and harder to compare against "1.5". */}
              <b>{rank.actual.toFixed(1)}</b> blunders a game against{' '}
              <b>{rank.expected.toFixed(1)}</b> expected
              {rank.ratingKnown ? (
                <>
                  {' '}
                  at {rank.rating}
                  {rank.pool ? ` ${rank.pool}` : ''}
                </>
              ) : (
                ' at an unknown rating'
              )}
              {rank.nextTier && (
                <>
                  {' · '}
                  {TIER_TEXT[rank.nextTier]} at {rank.toNextTier.toFixed(1)}
                </>
              )}
            </>
          )}
        </p>

        {/* Dense stat block: small-caps labels, bold figures, tight rhythm. */}
        <dl className="stats">
          <div className="stats__cell">
            <dt>Per game</dt>
            {/* One decimal, matching the rank line above — the two are the
                same number and shouldn't print differently. */}
            <dd>{summary.blundersPerGame.toFixed(1)}</dd>
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
                <span className="strip__no">{allGames.length - games.length + index + 1}</span>
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
        <button className="linkbtn" onClick={() => setShowDepth((v) => !v)}>
          Refresh
        </button>
      </div>

      {showDepth && (
        <div className="depth">
          <span className="depth__label">Analyse</span>
          {GAME_COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              className={`depth__option ${count === gameCount ? 'depth__option--on' : ''}`}
              onClick={() => {
                setShowDepth(false);
                onChangeGameCount(count);
              }}
            >
              {count} games
              {estimate(count) && <span className="depth__eta">{estimate(count)}</span>}
            </button>
          ))}
        </div>
      )}

      <footer className="footer">build {__BUILD_TIME__}</footer>
    </main>
  );
}
