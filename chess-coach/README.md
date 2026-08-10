# Chess Coach

A web app for reviewing your chess games: pull them from Chess.com, run
Stockfish over every move, and flag the blunders.

**Live:** https://victorvermabonany.github.io/ev-scanner-public/chess/

## How it's put together

The app runs entirely in the browser — it fetches games from Chess.com
directly and runs Stockfish as WebAssembly on-device. There's no backend to
deploy, pay for, or keep awake, which is why it can live on GitHub Pages.

```
chess-coach/
├── shared/               used by BOTH the browser and Node
│   ├── chesscom.js       Chess.com API client
│   └── analysis.js       blunder detection (engine-agnostic)
├── client/               the React app — this is what gets deployed
│   ├── public/engine/    Stockfish WASM
│   └── src/
│       ├── App.jsx       the whole UI
│       └── lib/engine.js Stockfish in a Web Worker
└── server/               optional; only needed for the CLI tools
    ├── index.js          Express app
    ├── engine.js         Stockfish as a native/Node subprocess
    └── scripts/          fetch-games.js, analyze-game.js
```

`shared/analysis.js` takes an *engine object* rather than talking to Stockfish
itself, so the same blunder-detection code runs against the native binary in
Node and the WASM build in the browser. `client/src/lib/engine.js` and
`server/engine.js` are the two implementations of that interface.

## Setup

Requires Node.js 18+ (tested on 22).

```bash
cd chess-coach
npm run install:all
```

## Run it locally

```bash
npm run dev
```

Open http://localhost:5173. (`npm run dev` also starts the Express server on
port 3001, but the browser app no longer needs it — it's there for the API
routes and the CLI.)

## Deploying

The built app is committed to `/chess` at the repo root, and GitHub Pages
serves it from `main`. To update the live site:

```bash
npm run build:pages     # builds and copies into ../chess
git add ../chess && git commit -m "Update site" && git push
```

Committing build output isn't ideal practice, but it's what lets Pages serve
this straight off `main` with no CI workflow and no settings to change.

## Blunder detection

In the browser: type a Chess.com username, pick a game, tap Analyse.

From the command line, with more control:

```bash
npm run analyze -- hikaru                 # most recent game
npm run analyze -- hikaru 3               # 4th most recent (0-indexed)
npm run analyze -- hikaru 0 --depth 16    # slower, more accurate
npm run analyze -- hikaru 0 --threshold 1.5
npm run analyze -- hikaru 0 --all         # every move, not just blunders
```

And raw game data, no analysis:

```bash
npm run games -- hikaru              # last 20 games, full raw JSON
npm run games -- hikaru 20 --summary # one line per game
```

### How the engine is chosen

In the browser it's always the bundled WASM build — specifically the
*lite-single* one, which is single-threaded and so needs no SharedArrayBuffer
and no COOP/COEP headers. That matters: static hosts like GitHub Pages can't
set those headers, so the multi-threaded build wouldn't run there. It's ~7MB,
downloaded once and then cached by the browser.

In Node, `server/engine.js` tries, in order:

1. `STOCKFISH_PATH`, if set.
2. A native binary at `/usr/games/stockfish`, `/usr/local/bin/stockfish`, or
   `/usr/bin/stockfish` (`apt install stockfish` puts it in the first).
3. The `stockfish` npm package's WASM build.

Native is roughly 2x faster; nothing needs configuring either way.

### How a blunder is decided

Every position in the game is evaluated once (a game of N moves is N+1
positions — the position after move *i* is the position before move *i+1*,
so nothing is evaluated twice).

UCI reports scores from the perspective of whoever is to move, which makes
raw evals impossible to compare across plies. Both engines normalise every
score to **White's perspective**, then `analysis.js` flips the sign for
Black's moves, so "loss" always means *the player who moved made their own
position worse*. A loss of 2.5 pawns or more is flagged.

Two details that stop false positives:

- **Evals are clamped to ±10 pawns before measuring a swing.** Otherwise
  going from +9 to +30 in a completely won position — or mate-in-5 to
  mate-in-3 — would register as a huge swing and every move in a won endgame
  would look like a blunder.
- **Mate scores are compared by sign, not distance**, so "I'm mating" ->
  "I'm getting mated" is correctly a blunder, while mate-in-6 -> mate-in-4
  is not.

Positions where the game has already ended (checkmate, stalemate) are scored
directly rather than asked of the engine, which has no move to search there.

Games that aren't standard chess (Chess960 and other variants) are listed but
can't be analysed — Stockfish would score them under the wrong rules.

### A caveat on repeatability

Stockfish's evaluation of the same position can shift slightly between runs,
because its hash table carries state from the positions analysed before it.
Moves that land very close to the threshold may flag on one run and not the
next. Higher depth makes results steadier. The browser app uses depth 10 to
stay quick on a phone; the CLI defaults to 12.

## Notes on the Chess.com API

No API key or account needed. Two things to know:

- It returns **403 without a `User-Agent`**, so `shared/chesscom.js` sends
  one. (Browsers set their own and silently ignore the header we set, which
  is fine — the 403 is only for a *missing* UA.)
- It sends `Access-Control-Allow-Origin: *`, which is what makes the
  no-backend version possible.

Games come back **newest first**, exactly as the API sends them. Chess.com
only exposes games one month at a time, so `fetchRecentGames` walks monthly
archives backwards from the current month until it has enough.
