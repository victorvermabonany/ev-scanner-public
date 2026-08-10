// Minimal UCI wrapper around Stockfish.
//
// Two ways to get an engine, tried in order:
//   1. A native binary — fastest. Set STOCKFISH_PATH, or install one
//      (`apt install stockfish` puts it in /usr/games/stockfish).
//   2. The `stockfish` npm package, a WebAssembly build. Slower, but it
//      installs with npm and runs anywhere Node does, including on hosts
//      where you can't apt-install anything.
//
// Both speak the same UCI protocol over stdin/stdout, so the rest of this
// file doesn't care which one it got.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);

const NATIVE_CANDIDATES = [
  '/usr/games/stockfish',
  '/usr/local/bin/stockfish',
  '/usr/bin/stockfish',
];

function resolveEngine() {
  if (process.env.STOCKFISH_PATH) {
    return { cmd: process.env.STOCKFISH_PATH, args: [], kind: 'native' };
  }
  for (const candidate of NATIVE_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return { cmd: candidate, args: [], kind: 'native' };
    }
  }
  // Bundled WASM build, run as its own Node process so it behaves exactly
  // like a native engine from the caller's point of view.
  const wasmEntry = require.resolve('stockfish/bin/stockfish.js');
  return { cmd: process.execPath, args: [wasmEntry], kind: 'wasm' };
}

export class Engine {
  #proc = null;
  #stdoutBuffer = '';
  #lineHandlers = new Set();

  constructor({ depth = 12 } = {}) {
    this.depth = depth;
    this.kind = null;
  }

  async start() {
    const { cmd, args, kind } = resolveEngine();
    this.kind = kind;

    this.#proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'ignore'] });
    this.#proc.stdout.setEncoding('utf8');
    this.#proc.stdout.on('data', (chunk) => this.#consume(chunk));
    this.#proc.on('error', (err) => {
      throw new Error(`Could not start Stockfish (${cmd}): ${err.message}`);
    });

    this.#send('uci');
    await this.#waitFor((line) => line === 'uciok');
    this.#send('setoption name MultiPV value 2');
    await this.#ready();
    return this;
  }

  #consume(chunk) {
    this.#stdoutBuffer += chunk;
    const lines = this.#stdoutBuffer.split('\n');
    this.#stdoutBuffer = lines.pop() ?? '';
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      for (const handler of [...this.#lineHandlers]) handler(line);
    }
  }

  #send(command) {
    this.#proc.stdin.write(`${command}\n`);
  }

  // Resolves once `predicate` returns true for an incoming line.
  #waitFor(predicate, timeoutMs = 60_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Stockfish did not respond in time'));
      }, timeoutMs);

      const handler = (line) => {
        let done = false;
        try {
          done = predicate(line);
        } catch (err) {
          cleanup();
          reject(err);
          return;
        }
        if (done) {
          cleanup();
          resolve(line);
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.#lineHandlers.delete(handler);
      };

      this.#lineHandlers.add(handler);
    });
  }

  async #ready() {
    this.#send('isready');
    await this.#waitFor((line) => line === 'readyok');
  }

  /** Tell the engine a new game is starting, so it clears its hash tables. */
  async newGame() {
    this.#send('ucinewgame');
    await this.#ready();
  }

  /**
   * Evaluate a position.
   *
   * UCI reports scores from the perspective of whoever is to move, which
   * makes evals impossible to compare across plies. This normalises
   * everything to White's perspective: positive means White is better,
   * regardless of whose turn it is.
   *
   * @returns {Promise<{cp: number|null, mate: number|null}>}
   */
  async evaluate(fen, depth = this.depth) {
    this.#send(`position fen ${fen}`);
    this.#send(`go depth ${depth}`);

    // With MultiPV 2 the engine reports the best line and the runner-up, which
    // is what tells an "only move" apart from one of several good options.
    const best = { 1: null, 2: null };
    const finalLine = await this.#waitFor((line) => {
      if (line.startsWith('info ') && line.includes(' score ')) {
        if (!/\b(lowerbound|upperbound)\b/.test(line)) {
          const rank = Number(line.match(/ multipv (\d+)/)?.[1] ?? 1);
          const score = line.match(/ score (cp|mate) (-?\d+)/);
          if (score && best[rank] !== undefined) {
            best[rank] = { kind: score[1], value: Number(score[2]) };
          }
        }
      }
      return line.startsWith('bestmove');
    });

    const bestToken = finalLine.split(/\s+/)[1];
    const bestMove = bestToken && bestToken !== '(none)' ? bestToken : null;
    const latest = best[1];

    if (!latest) return { cp: null, mate: null, bestMove, gapCp: null };

    // Both raw scores are relative to the side to move, so the gap between
    // them is meaningful without normalising first.
    const asCp = (s) => (s.kind === 'mate' ? (s.value > 0 ? 10000 : -10000) : s.value);
    const gapCp = best[2] ? Math.max(0, asCp(best[1]) - asCp(best[2])) : null;

    const whiteToMove = fen.split(' ')[1] === 'w';
    const signed = whiteToMove ? latest.value : -latest.value;

    return latest.kind === 'mate'
      ? { cp: null, mate: signed, bestMove, gapCp }
      : { cp: signed, mate: null, bestMove, gapCp };
  }

  async quit() {
    if (!this.#proc) return;
    this.#send('quit');
    this.#proc.stdin.end();
    this.#proc.kill();
    this.#proc = null;
  }
}
