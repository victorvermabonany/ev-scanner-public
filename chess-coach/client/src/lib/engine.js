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
    this.#send('setoption name MultiPV value 1');
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

    let latest = null;
    await this.#waitFor((line) => {
      if (line.startsWith('info ') && line.includes(' score ')) {
        if (!/\b(lowerbound|upperbound)\b/.test(line)) {
          const match = line.match(/ score (cp|mate) (-?\d+)/);
          if (match) latest = { kind: match[1], value: Number(match[2]) };
        }
      }
      return line.startsWith('bestmove');
    });

    if (!latest) return { cp: null, mate: null };

    const whiteToMove = fen.split(' ')[1] === 'w';
    const signed = whiteToMove ? latest.value : -latest.value;

    return latest.kind === 'mate'
      ? { cp: null, mate: signed }
      : { cp: signed, mate: null };
  }

  async quit() {
    if (!this.#worker) return;
    this.#worker.terminate();
    this.#worker = null;
  }
}
