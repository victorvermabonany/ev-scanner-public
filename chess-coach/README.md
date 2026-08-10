# Chess Coach

A web app for reviewing and learning from your chess games.

Two pieces:

- `client/` — the React frontend (Vite dev server, port **5173**)
- `server/` — the Node/Express API (port **3001**)

## Setup

Requires Node.js 18+ (tested on 22).

```bash
cd chess-coach
npm run install:all
```

## Run it

```bash
npm run dev
```

Then open http://localhost:5173.

This starts both the API and the frontend together. Requests the frontend
makes to `/api/...` are proxied to the server, so you only ever visit the
5173 URL in your browser.

You can also run them separately:

```bash
npm run dev:client   # frontend only
npm run dev:server   # API only
```

## Fetching games from Chess.com

Games come from the [Chess.com public API](https://www.chess.com/news/view/published-data-api).
It needs no API key or account — but it *does* reject requests that arrive
without a `User-Agent` header (403), so `server/chesscom.js` always sends one.

To check the data pulls correctly, run the script from `chess-coach/`:

```bash
npm run games -- hikaru              # last 20 games, full raw JSON
npm run games -- hikaru 5            # last 5
npm run games -- hikaru 20 --summary # one line per game
```

The same data is available over HTTP once the server is running:

```
GET /api/games/:username?limit=20    # limit caps at 100
```

Games are returned **newest first**, exactly as the API sends them (including
the full PGN). Chess.com only exposes games one month at a time, so
`fetchRecentGames` walks monthly archives backwards from the current month
until it has enough.

## Blunder detection (Stockfish)

```bash
npm run analyze -- hikaru                 # most recent game
npm run analyze -- hikaru 3               # 4th most recent (0-indexed)
npm run analyze -- hikaru 0 --depth 16    # slower, more accurate
npm run analyze -- hikaru 0 --threshold 1.5
npm run analyze -- hikaru 0 --all         # print every move, not just blunders
```

### How the engine is found

`server/engine.js` tries, in order:

1. `STOCKFISH_PATH`, if set.
2. A native binary at `/usr/games/stockfish`, `/usr/local/bin/stockfish`, or
   `/usr/bin/stockfish` (`apt install stockfish` puts it in the first).
3. The `stockfish` npm package — a WebAssembly build, roughly 2x slower but
   it installs with npm and runs anywhere Node does, including on hosts where
   you can't install system packages.

Nothing needs configuring; native is just faster if it's there.

### How a blunder is decided

Every position in the game is evaluated once (a game of N moves is N+1
positions — the position after move *i* is the position before move *i+1*,
so nothing is evaluated twice).

UCI reports scores from the perspective of whoever is to move, which makes
raw evals impossible to compare across plies. `engine.js` normalises every
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

### A caveat on repeatability

Stockfish's evaluation of the same position can shift slightly between runs,
because its hash table carries state from the positions analysed before it.
Moves that land very close to the threshold may flag on one run and not the
next. Raising `--depth` makes results steadier.

## Build

```bash
npm run build    # writes client/dist
npm run preview  # serves the built files locally
```

In production there's no Vite dev server — `server/index.js` serves the
built `client/dist` files itself, plus the `/api/*` routes, all from one
port. So a deployment only needs to run one process: build the client, then
start the server.

## Deploying (so you can open it from your phone)

Any host that can build and run a Node web service works — for example,
[Render](https://render.com):

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. On render.com, sign in with GitHub → **New +** → **Web Service** → pick
   this repo.
3. Set:
   - **Root Directory**: leave blank (repo root)
   - **Build Command**: `cd chess-coach && npm run install:all && npm run build`
   - **Start Command**: `cd chess-coach && npm --prefix server start`
   - **Instance Type**: Free
4. Deploy. Render gives you a `https://<name>.onrender.com` URL — open that
   on your phone.

No local machine or tunnel needed; the whole thing runs on Render's
infrastructure. (Free-tier services sleep after inactivity and take ~30s to
wake back up on the next request — normal for this tier, not a bug.)

## Layout

```
chess-coach/
├── package.json          scripts that run both halves
├── client/
│   ├── index.html        page shell
│   ├── vite.config.js    dev server + /api proxy
│   └── src/
│       ├── main.jsx      mounts React
│       ├── App.jsx       the homepage
│       └── styles.css    global styles
└── server/
    ├── index.js          Express app and routes
    ├── chesscom.js       Chess.com API client
    ├── engine.js         Stockfish UCI wrapper
    ├── analysis.js       move-by-move blunder detection
    └── scripts/
        ├── fetch-games.js   CLI for `npm run games`
        └── analyze-game.js  CLI for `npm run analyze`
```

Add new UI as components under `client/src/`, and new endpoints as routes in
`server/index.js`.
