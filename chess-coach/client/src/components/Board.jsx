import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';

// Tap a piece, then tap where it goes. Drag-and-drop is fiddly on a phone and
// would mean pulling in a DnD library for no real gain.
//
// Pieces are the filled Unicode glyphs for BOTH colours, recoloured in CSS.
// Using the outline glyphs for white renders inconsistently across platforms
// (some fonts fill them, some don't); one glyph set plus colour is stable.
const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

export function Board({ fen, orientation = 'w', onMove, disabled = false, lastMove = null }) {
  const [from, setFrom] = useState(null);

  const chess = useMemo(() => new Chess(fen), [fen]);
  const board = chess.board();

  // Where the selected piece may legally go.
  const targets = useMemo(() => {
    if (!from) return new Set();
    return new Set(chess.moves({ square: from, verbose: true }).map((m) => m.to));
  }, [chess, from]);

  const files = orientation === 'w' ? FILES : [...FILES].reverse();
  const ranks = orientation === 'w' ? RANKS : [...RANKS].reverse();

  function tap(square) {
    if (disabled) return;

    if (from && targets.has(square)) {
      onMove?.(from, square);
      setFrom(null);
      return;
    }

    const piece = chess.get(square);
    // Only the side to move can be picked up.
    setFrom(piece && piece.color === chess.turn() ? square : null);
  }

  return (
    <div className="board" role="grid">
      {ranks.map((rank) =>
        files.map((file) => {
          const square = `${file}${rank}`;
          const piece = board[8 - rank][FILES.indexOf(file)];
          const dark = (FILES.indexOf(file) + rank) % 2 === 0;

          const classes = [
            'sq',
            dark ? 'sq--dark' : 'sq--light',
            from === square ? 'sq--from' : '',
            targets.has(square) ? 'sq--target' : '',
            lastMove && (lastMove.from === square || lastMove.to === square) ? 'sq--last' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={square}
              className={classes}
              onClick={() => tap(square)}
              disabled={disabled}
              aria-label={square}
            >
              {piece && (
                <span className={`piece piece--${piece.color}`}>{GLYPH[piece.type]}</span>
              )}
              {targets.has(square) && !piece && <span className="dot" />}
            </button>
          );
        })
      )}
    </div>
  );
}
