// Stockfish in the browser.
//
// Same shape as server/engine.js — start(), newGame(), evaluate(), quit() —
// so shared/analysis.js works with either one without knowing the difference.
//
// The engine runs in a Web Worker, which keeps the search off the main thread
// so the page stays responsive while a game is analysed.
//
// We deliberately use the "lite-single" build: single-threaded, so it needs
// no SharedArrayBuffer and therefore no COOP/COEP headers — which matters
// because static hosts like GitHub Pages can't set those. It's ~7MB, fetched
// once and then cached by the browser.

const ENGINE_FILE = 'engine/stockfish-18-lite-single.js';

export class BrowserEngine {
  #worker = null;
  #lineHandlers = new Set();

  constructor({ depth = 12 } = {}) {
    this.depth = depth;
    this.kind = 'wasm (browser)';
  }

  async start() {
    // Resolve against the document base so this works whether the app is at
    // the domain root or in a subfolder.
    const url = new URL(ENGINE_FILE, document.baseURI).href;
    this.#worker = new Worker(url);

    this.#worker.onmessage = (event) => {
      const line = typeof event.data === 'string' ? event.data.trim() : '';
      if (!line) return;
      for (const handler of [...this.#lineHandlers]) handler(line);
    };

    this.#send('uci');
    await this.#waitFor((line) => line === 'uciok', 120_000);
    this.#send('setoption name MultiPV value 2');
    await this.#ready();
    return this;
  }

  #send(command) {
    this.#worker.postMessage(command);
  }

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
    await this.#waitFor((line) => line === 'readyok', 120_000);
  }

  async newGame() {
    this.#send('ucinewgame');
    await this.#ready();
  }

  /**
   * Evaluate a position, normalised to White's perspective (positive means
   * White is better) — UCI itself reports scores relative to whoever is to
   * move, which can't be compared across plies.
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
    if (!this.#worker) return;
    this.#worker.terminate();
    this.#worker = null;
  }
}
