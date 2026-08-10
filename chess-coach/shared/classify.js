// Works out *why* a blunder was a blunder, from the position it happened in.
//
// Four categories, each answering a different question:
//   hanging_piece — did the move leave material free to take?
//   missed_tactic — was there a concrete tactical shot available instead?
//   king_safety   — was the king exposed when it happened?
//   time_trouble  — was the clock nearly out?
//
// A blunder often matches more than one, so every match is recorded in
// `categories` and one is picked as `category` (see CATEGORY_PRIORITY).

import { Chess } from 'chess.js';

const PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

/** Material worth taking notice of — a minor piece or better. */
const MATERIAL_THRESHOLD = 200;

/** "Past move 15" for the king-in-the-centre rule. */
const CENTER_KING_AFTER_MOVE = 15;

// Most concrete explanation first. Severe time trouble overrides everything,
// because at 5 seconds the reason isn't really the position.
const CATEGORY_PRIORITY = [
  'hanging_piece',
  'missed_tactic',
  'king_safety',
  'time_trouble',
];

export const CATEGORY_LABELS = {
  hanging_piece: 'Hanging piece',
  missed_tactic: 'Missed tactic',
  king_safety: 'King safety',
  time_trouble: 'Time trouble',
  unclassified: 'Unclassified',
};

// ---------------------------------------------------------------- helpers

const fileIndex = (square) => square.charCodeAt(0) - 97;
const rankIndex = (square) => Number(square[1]) - 1;
const toSquare = (file, rank) => `${String.fromCharCode(97 + file)}${rank + 1}`;

function chebyshev(a, b) {
  return Math.max(
    Math.abs(fileIndex(a) - fileIndex(b)),
    Math.abs(rankIndex(a) - rankIndex(b))
  );
}

function piecesOf(chess, color) {
  const found = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.color === color) found.push(cell);
    }
  }
  return found;
}

const opposite = (color) => (color === 'w' ? 'b' : 'w');

/** "e2e4" / "e7e8q" -> a move object chess.js accepts. */
function uciToMove(uci) {
  if (!uci || uci.length < 4) return null;
  const move = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
  if (uci.length > 4) move.promotion = uci[4];
  return move;
}

// ------------------------------------------------------- static exchange

/**
 * How much material the side to move wins by capturing on `target`, playing
 * the exchange out with least-valuable-attacker first.
 *
 * This uses real legal moves rather than a raw attacker list, so pinned
 * defenders (which can't actually recapture) are handled correctly.
 */
function exchangeValue(chess, target) {
  const captures = chess
    .moves({ verbose: true })
    .filter((move) => move.to === target && move.captured);
  if (captures.length === 0) return 0;

  captures.sort((a, b) => PIECE_VALUE[a.piece] - PIECE_VALUE[b.piece]);
  const capture = captures[0];
  const gained = PIECE_VALUE[capture.captured];

  chess.move(capture);
  // Either side can stop capturing, hence the floor at 0.
  const net = Math.max(0, gained - exchangeValue(chess, target));
  chess.undo();
  return net;
}

/** The most material the side to move can win with a single capture. */
export function bestCapture(fen) {
  const chess = new Chess(fen);
  let best = { gain: 0, square: null, pieceType: null };

  const targets = [
    ...new Set(
      chess.moves({ verbose: true }).filter((m) => m.captured).map((m) => m.to)
    ),
  ];

  for (const target of targets) {
    const occupant = chess.get(target);
    const gain = exchangeValue(chess, target);
    if (gain > best.gain) {
      best = { gain, square: target, pieceType: occupant?.type ?? null };
    }
  }
  return best;
}

// ------------------------------------------------------------- 1. hanging

/**
 * After the move, can the opponent just take something?
 * Covers both "left a piece undefended" and "moved into a losing exchange".
 */
function detectHangingPiece(fenAfter) {
  const best = bestCapture(fenAfter);
  if (best.gain < MATERIAL_THRESHOLD) return null;
  return {
    gain: best.gain,
    square: best.square,
    pieceType: best.pieceType,
  };
}

// --------------------------------------------------------- 2. king safety

function kingSquareOf(chess, color) {
  return piecesOf(chess, color).find((p) => p.type === 'k')?.square ?? null;
}

/**
 * Is the opponent still carrying enough material to punish an exposed king?
 * Without this, every bare-king endgame would look like a king-safety problem.
 */
function hasAttackingMaterial(chess, color) {
  const pieces = piecesOf(chess, color).filter((p) => p.type !== 'k' && p.type !== 'p');
  const hasQueen = pieces.some((p) => p.type === 'q');
  return hasQueen || pieces.length >= 2;
}

function inspectKing(fen, color, moveNumber) {
  const chess = new Chess(fen);
  const kingSquare = kingSquareOf(chess, color);
  if (!kingSquare) return null;

  const enemy = opposite(color);
  const homeRank = color === 'w' ? 0 : 7;

  // Still sitting on d/e near its starting rank = never got castled away.
  const inCenter =
    ['d', 'e'].includes(kingSquare[0]) &&
    Math.abs(rankIndex(kingSquare) - homeRank) <= 1;
  const centerLate = inCenter && moveNumber > CENTER_KING_AFTER_MOVE;

  // Friendly pieces on the 8 squares around the king.
  const defenders = piecesOf(chess, color).filter(
    (p) => p.type !== 'k' && chebyshev(p.square, kingSquare) === 1
  ).length;

  // Enemy pieces bearing down on the king's immediate neighbourhood.
  let attackedZoneSquares = 0;
  for (let f = -1; f <= 1; f += 1) {
    for (let r = -1; r <= 1; r += 1) {
      const file = fileIndex(kingSquare) + f;
      const rank = rankIndex(kingSquare) + r;
      if (file < 0 || file > 7 || rank < 0 || rank > 7) continue;
      if (chess.attackers(toSquare(file, rank), enemy).length > 0) {
        attackedZoneSquares += 1;
      }
    }
  }

  // Two ways to be exposed, calibrated against real positions: a king with
  // its cover thinned out and any enemy pressure, or a king so far from
  // safety that much of its neighbourhood is under attack. A normally
  // castled king (4 adjacent defenders, 1 attacked square) trips neither.
  const exposed =
    hasAttackingMaterial(chess, enemy) &&
    ((defenders <= 2 && attackedZoneSquares >= 1) || attackedZoneSquares >= 3);

  if (!centerLate && !exposed) return null;

  return {
    kingSquare,
    defenders,
    attackedZoneSquares,
    reason: centerLate ? 'king still in the centre' : 'king short of defenders',
  };
}

/**
 * Check the king both before and after the move: a king can already be weak
 * (which is why the tactic existed), or the move itself can be what walks it
 * into the open. The position after takes precedence, since that's the one
 * the player is answerable for.
 */
function detectKingSafety(fenBefore, fenAfter, color, moveNumber) {
  const after = inspectKing(fenAfter, color, moveNumber);
  if (after) return { ...after, when: 'after the move' };

  const before = inspectKing(fenBefore, color, moveNumber);
  if (before) return { ...before, when: 'already, before the move' };

  return null;
}

// ------------------------------------------------------- 3. missed tactic

const RAY_DIRECTIONS = {
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
};
const raysFor = (type) =>
  type === 'q' ? [...RAY_DIRECTIONS.b, ...RAY_DIRECTIONS.r] : RAY_DIRECTIONS[type] ?? [];

/** The first two occupied squares along a ray from `from`. */
function firstTwoAlongRay(chess, from, [df, dr]) {
  const found = [];
  let file = fileIndex(from) + df;
  let rank = rankIndex(from) + dr;

  while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
    const square = toSquare(file, rank);
    const piece = chess.get(square);
    if (piece) {
      found.push({ square, ...piece });
      if (found.length === 2) break;
    }
    file += df;
    rank += dr;
  }
  return found;
}

/**
 * Was the engine's preferred move a recognisable tactic — and therefore
 * something the player missed rather than just a quieter better option?
 */
function detectMissedTactic(fenBefore, bestMoveUci) {
  const parsed = uciToMove(bestMoveUci);
  if (!parsed) return null;

  const before = new Chess(fenBefore);
  const mover = before.turn();
  const enemy = opposite(mover);

  let played;
  const after = new Chess(fenBefore);
  try {
    played = after.move(parsed);
  } catch {
    return null; // engine move didn't parse against this position
  }
  if (!played) return null;

  const patterns = [];
  const landedOn = played.to;
  const movedValue = PIECE_VALUE[played.piece];

  // --- fork: the piece that just moved hits two or more worthwhile targets
  const enemyPieces = piecesOf(after, enemy);
  const forked = enemyPieces.filter((piece) => {
    if (!after.attackers(piece.square, mover).includes(landedOn)) return false;
    if (piece.type === 'k') return true; // check always counts
    const undefended = after.attackers(piece.square, enemy).length === 0;
    return undefended || PIECE_VALUE[piece.type] > movedValue;
  });
  if (forked.length >= 2) {
    patterns.push({
      name: 'fork',
      targets: forked.map((p) => `${p.type}${p.square}`),
    });
  }

  // --- pin / skewer: two enemy pieces lined up on a ray from the new square
  for (const direction of raysFor(played.piece)) {
    const [front, behind] = firstTwoAlongRay(after, landedOn, direction);
    if (!front || !behind) continue;
    if (front.color !== enemy || behind.color !== enemy) continue;

    const frontValue = PIECE_VALUE[front.type];
    const behindValue = PIECE_VALUE[behind.type];

    if (behindValue > frontValue) {
      // Pin: the front piece is stuck, whether or not it's defended.
      patterns.push({ name: 'pin', front: front.square, behind: behind.square });
    } else if (frontValue > behindValue) {
      // Skewer: the front piece steps aside and you take what's behind — so
      // it only counts if that back piece is actually winnable. Otherwise
      // every check with a defended pawn behind the king looks like a skewer.
      //
      // The front piece doesn't count as a defender: it's the one being
      // driven away, so whatever it was guarding is guarded no longer.
      const backDefended = after
        .attackers(behind.square, enemy)
        .some((square) => square !== front.square);
      const worthTaking = !backDefended || behindValue > movedValue;
      if (worthTaking) {
        patterns.push({ name: 'skewer', front: front.square, behind: behind.square });
      }
    }
  }

  // --- discovered attack: moving away unveiled a different piece's attack
  for (const piece of enemyPieces) {
    if (PIECE_VALUE[piece.type] < 300 && piece.type !== 'k') continue;
    const attackersBefore = before.attackers(piece.square, mover);
    const revealed = after
      .attackers(piece.square, mover)
      .filter((square) => square !== landedOn && !attackersBefore.includes(square));
    if (revealed.length > 0) {
      patterns.push({
        name: 'discovered attack',
        by: revealed[0],
        target: `${piece.type}${piece.square}`,
      });
      break;
    }
  }

  // --- a capture that simply wins material
  if (played.captured) {
    const gain = exchangeValue(new Chess(fenBefore), played.to);
    if (gain >= MATERIAL_THRESHOLD) {
      patterns.push({ name: 'winning capture', gain });
    }
  }

  if (patterns.length === 0) return null;
  return { bestMove: played.san, patterns };
}

// -------------------------------------------------------- 4. time trouble

/**
 * Chess.com writes a clock into every move's comment: {[%clk 0:02:59.9]}.
 * They appear in move order, so index i is the clock after ply i+1.
 */
export function parseClocks(pgn) {
  const clocks = [];
  const pattern = /\[%clk\s+(\d+):(\d+):([\d.]+)\]/g;
  let match = pattern.exec(pgn);
  while (match) {
    clocks.push(
      Number(match[1]) * 3600 + Number(match[2]) * 60 + parseFloat(match[3])
    );
    match = pattern.exec(pgn);
  }
  return clocks;
}

/**
 * "180" -> 3 minutes. "180+2" -> 3 minutes plus 2s increment.
 * "1/86400" -> daily correspondence, where a clock means nothing like this.
 */
export function parseTimeControl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  if (raw.includes('/')) return { correspondence: true };
  const [base, increment] = raw.split('+');
  const baseSeconds = Number(base);
  if (!Number.isFinite(baseSeconds) || baseSeconds <= 0) return null;
  return {
    correspondence: false,
    baseSeconds,
    incrementSeconds: Number(increment) || 0,
  };
}

function detectTimeTrouble(ply, clocks, timeControl) {
  if (!timeControl || timeControl.correspondence) return null;

  // clocks[] is one entry per ply, in order; ply is 1-based.
  const remaining = clocks[ply - 1];
  if (remaining === undefined) return null;

  // Below a tenth of the starting time (floor 10s) counts as short of time;
  // below 10s is bad enough that it outranks any positional explanation.
  const lowThreshold = Math.max(timeControl.baseSeconds * 0.1, 10);
  if (remaining > lowThreshold) return null;

  return {
    secondsLeft: Number(remaining.toFixed(1)),
    thresholdSeconds: Number(lowThreshold.toFixed(1)),
    severe: remaining <= 10,
  };
}

// ------------------------------------------------------------- public API

/**
 * Categorise one blunder.
 *
 * @param {object} blunder     a record from analyseGame
 * @param {object} context
 * @param {string[]} [context.clocks]        from parseClocks(pgn)
 * @param {object}  [context.timeControl]    from parseTimeControl(header)
 * @param {string}  [context.bestMove]       engine's move in fenBefore (UCI)
 */
export function classifyBlunder(blunder, context = {}) {
  const { clocks = [], timeControl = null, bestMove = null } = context;

  const details = {};

  const hanging = detectHangingPiece(blunder.fenAfter);
  if (hanging) details.hanging_piece = hanging;

  const tactic = bestMove ? detectMissedTactic(blunder.fenBefore, bestMove) : null;
  if (tactic) details.missed_tactic = tactic;

  const king = detectKingSafety(
    blunder.fenBefore,
    blunder.fenAfter,
    blunder.color,
    blunder.moveNumber
  );
  if (king) details.king_safety = king;

  const time = detectTimeTrouble(blunder.ply, clocks, timeControl);
  if (time) details.time_trouble = time;

  const categories = CATEGORY_PRIORITY.filter((name) => details[name]);

  // Running out of clock explains a move better than anything on the board.
  let category = 'unclassified';
  if (time?.severe) {
    category = 'time_trouble';
  } else if (categories.length > 0) {
    [category] = categories;
  }

  return { category, categories, details };
}
