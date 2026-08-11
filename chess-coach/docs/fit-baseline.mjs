import { readFileSync } from 'fs';
const rows = JSON.parse(readFileSync('baseline-games.json', 'utf8'));

const BIN = 200;
const binOf = (r) => Math.floor(r / BIN) * BIN;

function table(subset, title) {
  const bins = {};
  for (const r of subset) {
    const b = binOf(r.rating);
    (bins[b] ??= { games: 0, moves: 0, blunders: 0, players: new Set() });
    bins[b].games += 1;
    bins[b].moves += r.moves;
    bins[b].blunders += r.blunders;
    bins[b].players.add(r.username);
  }
  console.log(`\n${title}`);
  console.log('  rating       players games  moves  blunders  per game  per 100 moves');
  const out = [];
  for (const b of Object.keys(bins).map(Number).sort((a, x) => a - x)) {
    const v = bins[b];
    const perGame = v.blunders / v.games;
    out.push({ mid: b + BIN / 2, perGame, per100: (100 * v.blunders) / v.moves, movesPerGame: v.moves / v.games, games: v.games, players: v.players.size });
    console.log(
      `  ${String(b).padStart(4)}-${String(b + BIN).padEnd(6)} ${String(v.players.size).padStart(6)} ` +
      `${String(v.games).padStart(6)} ${String(v.moves).padStart(6)} ${String(v.blunders).padStart(9)} ` +
      `${perGame.toFixed(2).padStart(9)} ${((100 * v.blunders) / v.moves).toFixed(2).padStart(14)}`
    );
  }
  return out;
}

const all = table(rows, 'ALL POOLS');
for (const pool of ['rapid', 'blitz', 'bullet']) {
  table(rows.filter((r) => r.pool === pool), pool.toUpperCase());
}

// Least-squares straight line through the bin midpoints, weighted by how many
// games each bin holds — the tails are thin and shouldn't steer the fit.
const usable = all.filter((b) => b.games >= 15);
const W = usable.reduce((s, b) => s + b.games, 0);
const mx = usable.reduce((s, b) => s + b.games * b.mid, 0) / W;
const my = usable.reduce((s, b) => s + b.games * b.per100, 0) / W;
const num = usable.reduce((s, b) => s + b.games * (b.mid - mx) * (b.per100 - my), 0);
const den = usable.reduce((s, b) => s + b.games * (b.mid - mx) ** 2, 0);
const slope = num / den;
const intercept = my - slope * mx;

console.log(`\nweighted fit over bins with >=15 games (${usable.length} bins, ${W} games):`);
console.log(`  per100 = ${intercept.toFixed(4)} ${slope >= 0 ? '+' : '-'} ${Math.abs(slope).toFixed(6)} x rating`);
console.log(`  per 200 points: ${(slope * 200).toFixed(2)} blunders per 100 moves`);
const ybar = my;
const ssTot = usable.reduce((s, b) => s + b.games * (b.per100 - ybar) ** 2, 0);
const ssRes = usable.reduce((s, b) => s + b.games * (b.per100 - (intercept + slope * b.mid)) ** 2, 0);
console.log(`  weighted R^2: ${(1 - ssRes / ssTot).toFixed(2)}`);
const totalMoves = rows.reduce((s, r) => s + r.moves, 0);
console.log(`  overall moves per game: ${(totalMoves / rows.length).toFixed(1)}`);

console.log('\nanchors for tier.js:');
for (let r = 500; r <= 1900; r += 200) {
  const fitted = intercept + slope * r;
  const bin = all.find((b) => b.mid === r);
  console.log(
    `  { rating: ${r}, per100: ${Math.max(0.5, fitted).toFixed(1)} },` +
    `   // fit ${fitted.toFixed(2)}` +
    (bin ? `, measured ${bin.per100.toFixed(2)} from ${bin.games} games / ${bin.players} players (${bin.movesPerGame.toFixed(0)} moves/game)` : ', no games in this bin')
  );
}
