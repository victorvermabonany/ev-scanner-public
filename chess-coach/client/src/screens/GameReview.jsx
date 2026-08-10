import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { LABEL_TEXT } from '../../../shared/labels.js';
import { Board } from '../components/Board.jsx';
import { EvalBar } from '../components/EvalBar.jsx';

/** Labels worth counting in the header — the ones that cost something. */
const COSTLY = ['blunder', 'mistake', 'inaccuracy'];

export default function GameReview({ game, onBack }) {
  // Replay once to get the position after each ply. Storing a FEN per move
  // would be tens of kilobytes a game; replaying costs nothing here.
  const positions = useMemo(() => {
    const chess = game.startFen ? new Chess(game.startFen) : new Chess();
    const out = [{ fen: chess.fen(), from: null, to: null }];
    for (const move of game.moves) {
      try {
        const played = chess.move(move.san);
        out.push({ fen: chess.fen(), from: played.from, to: played.to });
      } catch {
        break; // malformed history — show what we could replay
      }
    }
    return out;
  }, [game]);

  // Open on the first thing worth looking at, not move one.
  const firstProblem = game.moves.findIndex((m) => COSTLY.includes(m.label));
  const [selected, setSelected] = useState(firstProblem === -1 ? 0 : firstProblem);
  const [playing, setPlaying] = useState(false);
  const listRef = useRef(null);

  const lastIndex = game.moves.length - 1;
  const atStart = selected <= 0;
  const atEnd = selected >= lastIndex;

  const step = (delta) =>
    setSelected((i) => Math.max(0, Math.min(lastIndex, i + delta)));

  // Auto-advance. Slow enough to read the board between moves, and it stops
  // itself at the end rather than sitting on the last move still "playing".
  useEffect(() => {
    if (!playing) return undefined;
    if (atEnd) {
      setPlaying(false);
      return undefined;
    }
    const timer = setTimeout(() => setSelected((i) => Math.min(lastIndex, i + 1)), 1750);
    return () => clearTimeout(timer);
  }, [playing, selected, atEnd, lastIndex]);

  // Keep the highlighted move visible while stepping, otherwise it walks off
  // the bottom of the list and you're navigating blind.
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector('.moverow__cell--on');
    if (!list || !active) return;

    // Scroll the list itself rather than calling scrollIntoView, which also
    // scrolls the page — that dragged the board and the buttons off the top
    // of the screen while stepping through a game.
    const item = active.getBoundingClientRect();
    const box = list.getBoundingClientRect();
    if (item.top < box.top) list.scrollTop -= box.top - item.top;
    else if (item.bottom > box.bottom) list.scrollTop += item.bottom - box.bottom;
  }, [selected]);

  const move = game.moves[selected];
  const position = positions[selected + 1] ?? positions[0];
  const orientation = game.color ?? 'w';
  const accuracy = game.accuracy?.[orientation];

  // Pair the moves the way a scoresheet does: one row per move number.
  const rows = [];
  for (let i = 0; i < game.moves.length; i += 1) {
    const m = game.moves[i];
    let row = rows[rows.length - 1];
    if (!row || row.number !== m.moveNumber || row[m.color]) {
      row = { number: m.moveNumber, w: null, b: null };
      rows.push(row);
    }
    row[m.color] = { ...m, index: i };
  }

  const result =
    game.outcome === 'win' ? '1–0' : game.outcome === 'loss' ? '0–1' : '½–½';

  return (
    <main className="screen review">
      <header className="rep__head">
        <button className="linkbtn" onClick={onBack}>
          ← Back
        </button>
        <span className="rep__period">
          {game.playedAt} · {result}
        </span>
      </header>

      {/* At-a-glance read before anyone scrolls the move list. */}
      {/* These figures count the player's own moves; the move list below
          grades both sides. */}
      <section className="reviewtop">
        <div className="reviewtop__acc">
          <span className="reviewtop__accvalue">{accuracy ?? '—'}%</span>
          <span className="reviewtop__acclabel">Your accuracy</span>
        </div>
        <dl className="reviewtop__counts">
          {COSTLY.map((key) => (
            <div key={key} className={`rtc rtc--${key}`}>
              <dt>{LABEL_TEXT[key]}</dt>
              <dd>{game.tally?.[key] ?? 0}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="review__players">
        {game.white} <span className="review__vs">vs</span> {game.black}
      </p>

      <div className="boardwrap">
        <EvalBar
          evaluation={{ cp: move?.cp, mate: move?.mate, terminal: move?.terminal }}
          orientation={orientation}
        />
        <Board
          fen={position.fen}
          orientation={orientation}
          disabled
          lastMove={position}
          // The engine's move, shown only where the played move cost something.
          arrow={move && COSTLY.includes(move.label) ? { from: move.bestFrom, to: move.bestTo } : null}
        />
      </div>

      {/* Big targets: stepping a whole game happens on a phone, one thumb. */}
      <div className="controls">
        <button
          className="controls__btn"
          onClick={() => {
            setPlaying(false);
            step(-1);
          }}
          disabled={atStart}
          aria-label="Previous move"
        >
          ‹
        </button>
        <button
          className="controls__btn controls__btn--play"
          onClick={() => setPlaying((v) => !v)}
          disabled={atEnd && !playing}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          className="controls__btn"
          onClick={() => {
            setPlaying(false);
            step(1);
          }}
          disabled={atEnd}
          aria-label="Next move"
        >
          ›
        </button>
      </div>

      {move && (
        <div className={`movecard movecard--${move.label}`}>
          <p className="movecard__head">
            <span className="movecard__san">
              {move.moveNumber}
              {move.color === 'w' ? '.' : '…'} {move.san}
            </span>
            <span className={`chip chip--${move.label}`}>{LABEL_TEXT[move.label]}</span>
          </p>
          {/* Good, Best, Great, Brilliant and Book need no explanation. */}
          {COSTLY.includes(move.label) && move.explanation && (
            <p className="movecard__why">{move.explanation}</p>
          )}
        </div>
      )}

      <ol className="movelist" ref={listRef}>
        {rows.map((row, rowIndex) => (
          <li key={`${row.number}-${rowIndex}`} className="moverow">
            <span className="moverow__no">{row.number}.</span>
            {['w', 'b'].map((side) => {
              const m = row[side];
              if (!m) return <span key={side} className="moverow__cell" />;
              return (
                <button
                  key={side}
                  className={`moverow__cell moverow__cell--${m.label} ${
                    m.index === selected ? 'moverow__cell--on' : ''
                  }`}
                  onClick={() => {
                    // Tapping the list is a deliberate jump, so stop playback
                    // rather than have it yank you somewhere else a second later.
                    setPlaying(false);
                    setSelected(m.index);
                  }}
                >
                  {m.san}
                </button>
              );
            })}
          </li>
        ))}
      </ol>

      <footer className="footer">build {__BUILD_TIME__}</footer>
    </main>
  );
}
