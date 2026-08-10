import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from '../components/Board.jsx';

const CLASS_LABEL = {
  blunder: 'Blunder',
  mistake: 'Mistake',
  inaccuracy: 'Inaccuracy',
  good: 'Good',
};

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
  const firstProblem = game.moves.findIndex((m) => m.classification !== 'good');
  const [selected, setSelected] = useState(firstProblem === -1 ? 0 : firstProblem);

  const move = game.moves[selected];
  const position = positions[selected + 1] ?? positions[0];

  // Pair the moves up the way a scoresheet does: one row per move number.
  const rows = [];
  for (let i = 0; i < game.moves.length; i += 1) {
    const m = game.moves[i];
    const row = rows.find((r) => r.number === m.moveNumber) ?? {
      number: m.moveNumber,
      w: null,
      b: null,
    };
    if (!rows.includes(row)) rows.push(row);
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

      <p className="review__players">
        {game.white} <span className="review__vs">vs</span> {game.black}
      </p>

      <Board
        fen={position.fen}
        orientation={game.color ?? 'w'}
        disabled
        lastMove={position}
      />

      {move && (
        <div className={`movecard movecard--${move.classification}`}>
          <p className="movecard__head">
            <span className="movecard__san">
              {move.moveNumber}
              {move.color === 'w' ? '.' : '…'} {move.san}
            </span>
            <span className={`chip chip--${move.classification}`}>
              {CLASS_LABEL[move.classification]}
            </span>
          </p>
          {/* Good moves get the label and nothing else. */}
          {move.explanation && <p className="movecard__why">{move.explanation}</p>}
        </div>
      )}

      <ol className="movelist">
        {rows.map((row) => (
          <li key={row.number} className="moverow">
            <span className="moverow__no">{row.number}.</span>
            {['w', 'b'].map((side) => {
              const m = row[side];
              if (!m) return <span key={side} className="moverow__cell" />;
              return (
                <button
                  key={side}
                  className={`moverow__cell moverow__cell--${m.classification} ${
                    m.index === selected ? 'moverow__cell--on' : ''
                  }`}
                  onClick={() => setSelected(m.index)}
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
