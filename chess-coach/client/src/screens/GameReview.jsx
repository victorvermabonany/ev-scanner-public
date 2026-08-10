import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { LABEL_TEXT } from '../../../shared/labels.js';
import { noteForMove, personalise } from '../../../shared/explain.js';
import { accuracyBand } from '../../../shared/score.js';
import { Board } from '../components/Board.jsx';
import { EvalBar } from '../components/EvalBar.jsx';

/** Labels worth counting in the header — the ones that cost something. */
const COSTLY = ['blunder', 'mistake', 'inaccuracy'];

/** "1 blunder", "3 blunders" — the counts read as a sentence, not a table. */
const PLURALS = { blunder: 'blunders', mistake: 'mistakes', inaccuracy: 'inaccuracies' };
const plural = (count, key) =>
  `${count} ${count === 1 ? LABEL_TEXT[key].toLowerCase() : PLURALS[key]}`;

/**
 * A name plate above or below the board.
 *
 * Replaces the centred "white vs black" line, which named both players but
 * said nothing about which was which, which colour either had, or how well
 * they played. Sitting flush against the board, each plate belongs to the
 * side it faces.
 */
function Seat({ color, name, accuracy, you = false }) {
  return (
    <p className={`seat ${you ? 'seat--you' : ''}`}>
      <span className={`seat__disc seat__disc--${color}`} aria-hidden="true" />
      <span className="seat__name">{name}</span>
      {you && <span className="seat__tag">you</span>}
      {accuracy != null && (
        <span className={`seat__acc seat__acc--${accuracyBand(accuracy)}`}>
          {accuracy}%
        </span>
      )}
    </p>
  );
}

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
  const opponentColor = orientation === 'w' ? 'b' : 'w';

  // The board is drawn from the player's side, so the seat above it is always
  // the opponent and the seat below is always the player — the way a board
  // reads across the table, and the way Chess.com lays a review out.
  const seats = {
    top: { color: opponentColor, name: opponentColor === 'w' ? game.white : game.black },
    bottom: { color: orientation, name: orientation === 'w' ? game.white : game.black },
  };

  // The engine's move in notation, for the moves where it differs from what
  // was played. Read from the position this move was played *from*, which is
  // the entry before it in the replay.
  const bestSan = useMemo(() => {
    if (!move?.bestFrom || !move?.bestTo) return null;
    const before = positions[selected];
    if (!before) return null;
    try {
      const san = new Chess(before.fen).move({
        from: move.bestFrom,
        to: move.bestTo,
        promotion: 'q',
      })?.san;
      return san && san !== move.san ? san : null;
    } catch {
      return null;
    }
  }, [move, positions, selected]);

  // Every move gets a sentence, not just the costly ones. A review that goes
  // blank on two moves out of three isn't a review.
  const note = !move
    ? null
    : move.explanation
      ? personalise(move.explanation, { mine: move.color === orientation })
      : noteForMove(move.label, { bestSan, lossCp: move.lossCp });

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

      {/* One line rather than a row of boxes: the board is what this screen
          is for, and these counts are context, not the headline. They cover
          the player's own moves; the move list below grades both sides. */}
      <p className="reviewbar">
        <span className="reviewbar__label">Your moves</span>
        {COSTLY.map((key) => (
          <span key={key} className={`rbc rbc--${key}`}>
            {plural(game.tally?.[key] ?? 0, key)}
          </span>
        ))}
      </p>

      {/* Board block: seat, board, seat — the arrangement you'd see across a
          table, and the one Chess.com's review uses. */}
      <Seat {...seats.top} accuracy={game.accuracy?.[seats.top.color]} />

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

      <Seat {...seats.bottom} accuracy={game.accuracy?.[seats.bottom.color]} you />

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

      {/* The plain-language read. This is the reason to use the app rather
          than any engine output, so it sits directly under the controls at
          full width, and it never collapses to nothing. */}
      {move && (
        <div className={`movecard movecard--${move.label}`}>
          <p className="movecard__head">
            <span className={`chip chip--${move.label}`}>{LABEL_TEXT[move.label]}</span>
            <span className="movecard__san">
              {move.moveNumber}
              {move.color === 'w' ? '.' : '…'} {move.san}
            </span>
            <span className="movecard__who">
              {move.color === orientation ? 'you' : 'opponent'}
            </span>
          </p>
          {note && <p className="movecard__why">{note}</p>}
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
