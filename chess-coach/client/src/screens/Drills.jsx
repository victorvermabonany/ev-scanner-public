import { useState } from 'react';
import { Chess } from 'chess.js';
import { CATEGORY_LABELS } from '../../../shared/classify.js';
import { formatEval } from '../../../shared/analysis.js';
import { Board } from '../components/Board.jsx';
import { loadCompleted, markCompleted } from '../lib/storage.js';
import { track } from '../lib/analytics.js';

const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** UCI ("g1f3", "e7e8q") -> the move object chess.js takes. */
function uciToMove(uci) {
  if (!uci || uci.length < 4) return null;
  const move = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
  if (uci.length > 4) move.promotion = uci[4];
  return move;
}

/** The engine's move in readable notation, played out on the drill position. */
function bestMoveSan(drill) {
  try {
    const chess = new Chess(drill.fen);
    return chess.move(uciToMove(drill.bestMove))?.san ?? null;
  } catch {
    return null;
  }
}

/**
 * Evals are stored White-relative. Showing "+2.10 → +4.99" to someone who was
 * playing Black reads like an improvement when it's the opposite, so flip the
 * sign to the drilling player's point of view: negative always means worse
 * for them.
 */
function fromPerspective(evaluation, color) {
  if (!evaluation || color === 'w') return evaluation;
  return {
    cp: evaluation.cp == null ? evaluation.cp : -evaluation.cp,
    mate: evaluation.mate == null ? evaluation.mate : -evaluation.mate,
    terminal:
      evaluation.terminal === 'white_mates'
        ? 'black_mates'
        : evaluation.terminal === 'black_mates'
          ? 'white_mates'
          : evaluation.terminal,
  };
}

/**
 * Why the engine's move beat what was played. Everything here comes from data
 * already stored with the blunder — no engine call, so the drill stays instant
 * and works with the analysis you already ran.
 */
function explain(drill, best) {
  const parts = [];
  const d = drill.details ?? {};

  if (d.missed_tactic?.patterns?.length) {
    parts.push(`${best} is a ${d.missed_tactic.patterns.map((p) => p.name).join(' and ')}`);
  }
  if (d.hanging_piece) {
    const name = PIECE_NAMES[d.hanging_piece.pieceType] ?? 'piece';
    parts.push(
      `${drill.played} left the ${name} on ${d.hanging_piece.square} free to take`
    );
  }
  if (d.king_safety) {
    parts.push(`${drill.played} left the king short of cover on ${d.king_safety.kingSquare}`);
  }
  if (d.time_trouble) {
    parts.push(`played with ${d.time_trouble.secondsLeft}s on the clock`);
  }

  const swing =
    `${drill.played} took the evaluation from ` +
    `${formatEval(fromPerspective(drill.evalBefore, drill.color))} to ` +
    `${formatEval(fromPerspective(drill.evalAfter, drill.color))} ` +
    `from ${drill.color === 'w' ? "White's" : "Black's"} point of view`;

  return parts.length ? `${parts.join('; ')}. ${swing}.` : `${swing}.`;
}

function Drill({ drill, index, total, onDone, onBack }) {
  const best = bestMoveSan(drill);
  const [attempt, setAttempt] = useState(null);

  function handleMove(from, to) {
    if (attempt) return;

    const chess = new Chess(drill.fen);
    let move;
    try {
      move = chess.move({ from, to, promotion: 'q' });
    } catch {
      return; // illegal — board shouldn't offer it, but be safe
    }
    if (!move) return;

    const bestParsed = uciToMove(drill.bestMove);
    const correct = move.from === bestParsed.from && move.to === bestParsed.to;

    setAttempt({ san: move.san, correct, from, to });
    onDone(drill.id, correct); // "completed" means attempted, right or wrong
  }

  const youAre = drill.color === 'w' ? 'White' : 'Black';

  return (
    <main className="screen drill">
      <header className="rep__head">
        <button className="linkbtn" onClick={onBack}>
          ← Back
        </button>
        <span className="rep__period">
          {index + 1} of {total}
        </span>
      </header>

      <p className="drill__prompt">
        {attempt ? `Move ${drill.moveNumber} · you played ${drill.played}` : `Find the best move for ${youAre}`}
      </p>

      <Board
        fen={drill.fen}
        orientation={drill.color}
        onMove={handleMove}
        disabled={Boolean(attempt)}
        lastMove={attempt}
      />

      {attempt ? (
        <div className={`verdict ${attempt.correct ? 'verdict--good' : 'verdict--bad'}`}>
          <p className="verdict__head">
            {attempt.correct
              ? `Correct — ${best} is the engine's move.`
              : `You played ${attempt.san}. The engine plays ${best}.`}
          </p>
          <p className="verdict__why">{explain(drill, best)}</p>
        </div>
      ) : (
        <p className="drill__hint">Tap a piece, then where it should go.</p>
      )}

      <div className="drill__actions">
        <a href={drill.gameUrl} target="_blank" rel="noreferrer" className="linkbtn">
          View game
        </a>
        {attempt && (
          <button className="linkbtn" onClick={onBack}>
            Done →
          </button>
        )}
      </div>
    </main>
  );
}

export default function Drills({ summary, onBack }) {
  // Drill progress belongs to this profile, not to the device.
  const [completed, setCompleted] = useState(() => loadCompleted(summary.username));
  const [active, setActive] = useState(null);

  // This week's focus area, which is the whole point of drilling.
  const focus = summary.topCategory;
  const drills = (summary.drills ?? []).filter((drill) => drill.category === focus);

  function complete(id, correct) {
    track('Drill completed', { result: correct ? 'correct' : 'incorrect' });
    markCompleted(summary.username, id);
    setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  if (active !== null && drills[active]) {
    return (
      <Drill
        drill={drills[active]}
        index={active}
        total={drills.length}
        onDone={complete}
        onBack={() => setActive(null)}
      />
    );
  }

  const doneCount = drills.filter((d) => completed.includes(d.id)).length;

  return (
    <main className="screen drills">
      <header className="rep__head">
        <button className="linkbtn" onClick={onBack}>
          ← Back
        </button>
        <span className="rep__period">
          {doneCount}/{drills.length} done
        </span>
      </header>

      <div>
        <h1 className="drills__title">Drills</h1>
        <p className="drills__sub">
          {focus ? `Your focus this week: ${CATEGORY_LABELS[focus]}` : 'Nothing to drill'}
        </p>
      </div>

      {drills.length === 0 ? (
        <p className="rep__empty">
          {summary.drills
            ? 'No positions in this category yet. Play a few more games and refresh.'
            : 'Refresh your analysis on the home screen to generate drills.'}
        </p>
      ) : (
        <ul className="drilllist">
          {drills.map((drill, index) => (
            <li key={drill.id}>
              <button className="drillrow" onClick={() => setActive(index)}>
                <span className={`tick ${completed.includes(drill.id) ? 'tick--on' : ''}`}>
                  {completed.includes(drill.id) ? '✓' : index + 1}
                </span>
                <span className="drillrow__text">
                  <span className="drillrow__title">
                    Move {drill.moveNumber} · {drill.played}
                  </span>
                  <span className="drillrow__meta">
                    vs {drill.opponent} · lost {(drill.lossCp / 100).toFixed(1)}
                  </span>
                </span>
                <span className="drillrow__go">→</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="footer">build {__BUILD_TIME__}</footer>
    </main>
  );
}
