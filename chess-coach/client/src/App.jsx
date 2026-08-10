import { useRef, useState } from 'react';
import { fetchRecentGames, ChessComError } from '../../shared/chesscom.js';
import { analyseGame, formatEval, DEFAULT_THRESHOLD_PAWNS } from '../../shared/analysis.js';
import { CATEGORY_LABELS } from '../../shared/classify.js';
import { BrowserEngine } from './lib/engine.js';

const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** Plain-language reason for the category, from the detector's own findings. */
function explain(details = {}) {
  if (details.hanging_piece) {
    const name = PIECE_NAMES[details.hanging_piece.pieceType] ?? 'material';
    return `${name} on ${details.hanging_piece.square} can be taken (+${(
      details.hanging_piece.gain / 100
    ).toFixed(1)})`;
  }
  if (details.missed_tactic) {
    return `${details.missed_tactic.bestMove} was available — ${details.missed_tactic.patterns
      .map((p) => p.name)
      .join(', ')}`;
  }
  if (details.king_safety) {
    return `${details.king_safety.reason} (king ${details.king_safety.kingSquare}, ${details.king_safety.defenders} defender${
      details.king_safety.defenders === 1 ? '' : 's'
    } adjacent)`;
  }
  if (details.time_trouble) {
    return `${details.time_trouble.secondsLeft}s left on the clock`;
  }
  return 'no pattern matched';
}

// Depth 10 keeps a full game under ~30s on a phone. The CLI defaults to 12;
// raise this if you're on a laptop and want steadier numbers.
const DEPTH = 10;

function GameRow({ game, onAnalyse, disabled, isActive }) {
  const played = new Date(game.end_time * 1000).toLocaleDateString();
  return (
    <li className={`game ${isActive ? 'game--active' : ''}`}>
      <div className="game__players">
        <span>{game.white.username} ({game.white.rating})</span>
        <span className="game__vs">vs</span>
        <span>{game.black.username} ({game.black.rating})</span>
      </div>
      <div className="game__meta">
        {played} · {game.time_class}
        {game.rules !== 'chess' && <span className="game__variant"> · {game.rules}</span>}
      </div>
      <button
        className="btn btn--small"
        onClick={() => onAnalyse(game)}
        disabled={disabled || game.rules !== 'chess'}
      >
        {game.rules === 'chess' ? 'Analyse' : 'Variant — not supported'}
      </button>
    </li>
  );
}

function Blunder({ blunder, game }) {
  const player = blunder.color === 'w' ? game.white.username : game.black.username;
  return (
    <li className="blunder">
      <div className="blunder__head">
        <span className="blunder__move">
          {blunder.moveNumber}{blunder.color === 'w' ? '.' : '...'} {blunder.san}
        </span>
        <span className="blunder__player">{player}</span>
      </div>
      <div className="blunder__tags">
        <span className={`tag tag--${blunder.category}`}>
          {CATEGORY_LABELS[blunder.category]}
        </span>
        {blunder.categories
          ?.filter((name) => name !== blunder.category)
          .map((name) => (
            <span key={name} className="tag tag--secondary">
              {CATEGORY_LABELS[name]}
            </span>
          ))}
      </div>
      <p className="blunder__why">{explain(blunder.categoryDetails)}</p>
      <div className="blunder__evals">
        <span className="eval">{formatEval(blunder.evalBefore)}</span>
        <span className="blunder__arrow">→</span>
        <span className="eval eval--bad">{formatEval(blunder.evalAfter)}</span>
        <span className="blunder__swing">
          −{(blunder.lossCp / 100).toFixed(2)}
        </span>
      </div>
      <code className="blunder__fen">{blunder.fenBefore}</code>
    </li>
  );
}

export default function App() {
  const [username, setUsername] = useState('');
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [error, setError] = useState(null);

  const [activeGame, setActiveGame] = useState(null);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  // One engine for the whole session — starting it downloads ~7MB, so it's
  // worth keeping around between analyses.
  const engineRef = useRef(null);

  async function loadGames(event) {
    event.preventDefault();
    if (!username.trim()) return;

    setLoadingGames(true);
    setError(null);
    setGames([]);
    setResult(null);
    setActiveGame(null);

    try {
      setGames(await fetchRecentGames(username.trim(), 20));
    } catch (err) {
      setError(
        err instanceof ChessComError ? err.message : 'Could not load games. Try again.'
      );
    } finally {
      setLoadingGames(false);
    }
  }

  async function analyse(game) {
    setActiveGame(game);
    setResult(null);
    setError(null);
    setProgress({ done: 0, total: 0, stage: 'Starting engine…' });

    try {
      if (!engineRef.current) {
        engineRef.current = new BrowserEngine({ depth: DEPTH });
        await engineRef.current.start();
      }

      const analysis = await analyseGame(game.pgn, {
        engine: engineRef.current,
        depth: DEPTH,
        onProgress: (done, total) => setProgress({ done, total, stage: 'Analysing' }),
      });

      setResult(analysis);
    } catch (err) {
      setError(err.message ?? 'Analysis failed.');
    } finally {
      setProgress(null);
    }
  }

  const busy = Boolean(progress);

  return (
    <main className="page">
      <header className="header">
        <h1 className="title">Chess Coach</h1>
        <p className="subtitle">Find the moves that cost you the game.</p>
      </header>

      <form className="search" onSubmit={loadGames}>
        <input
          className="input"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Chess.com username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
        />
        <button className="btn" type="submit" disabled={loadingGames || busy}>
          {loadingGames ? 'Loading…' : 'Load games'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {progress && (
        <div className="progress">
          <span>
            {progress.stage}
            {progress.total > 0 && ` ${progress.done}/${progress.total}`}
          </span>
          <div className="progress__track">
            <div
              className="progress__bar"
              style={{
                width: progress.total ? `${(progress.done / progress.total) * 100}%` : '15%',
              }}
            />
          </div>
          {progress.total === 0 && (
            <span className="progress__note">
              First run downloads the engine (~7&nbsp;MB). It's cached after this.
            </span>
          )}
        </div>
      )}

      {result && activeGame && (
        <section className="results">
          <h2 className="results__title">
            {result.blunders.length} blunder{result.blunders.length === 1 ? '' : 's'} in{' '}
            {result.moves.length} moves
          </h2>
          <p className="results__sub">
            Swing of {DEFAULT_THRESHOLD_PAWNS}+ pawns · depth {DEPTH} ·{' '}
            <a href={activeGame.url} target="_blank" rel="noreferrer">
              view game
            </a>
          </p>
          {result.blunders.length === 0 ? (
            <p className="empty">No blunders at this threshold. Clean game.</p>
          ) : (
            <ul className="blunders">
              {result.blunders.map((blunder) => (
                <Blunder key={blunder.ply} blunder={blunder} game={activeGame} />
              ))}
            </ul>
          )}
        </section>
      )}

      {games.length > 0 && (
        <section>
          <h2 className="section-title">Recent games</h2>
          <ul className="games">
            {games.map((game) => (
              <GameRow
                key={game.uuid ?? game.url}
                game={game}
                onAnalyse={analyse}
                disabled={busy}
                isActive={activeGame?.url === game.url}
              />
            ))}
          </ul>
        </section>
      )}

      <footer className="footer">build {__BUILD_TIME__}</footer>
    </main>
  );
}
