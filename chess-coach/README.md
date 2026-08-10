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
│   ├── analysis.js       blunder detection (engine-agnostic)
│   ├── classify.js       why a blunder happened
│   ├── weekly.js         rolls games up into one period's numbers
│   └── coach.js          writes that up in three voices
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

## Analytics

Off by default. Nothing is loaded and nothing is sent until a domain is set,
so the app makes no third-party requests out of the box.

To switch it on, build with your Plausible domain:

```bash
VITE_ANALYTICS_DOMAIN=yourdomain.com npm run build:pages
```

Events, chosen to answer "where do people drop off, and do they come back":

| Event | When |
|---|---|
| pageview | automatic, from the script |
| `Username entered` | a username passed validation |
| `Analysis started` | with the game count chosen |
| `Analysis completed` | with the count, and whether any game was skipped |
| `Analysis failed` | with the failure headline |
| `Drill completed` | with correct / incorrect |
| `Returning visit` | this browser was here on an earlier day |

The Chess.com username, game URLs and error details are deliberately never
sent — only event names and coarse buckets. Return visits work off a single
locally stored date rather than a cookie or an ID, so they can tell "this
browser was here before" and nothing more.

`client/src/lib/analytics.js` is the only file that knows the provider;
swapping to GoatCounter or Simple Analytics means changing the script URL
and the send call.

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

### Categorising a blunder

Each flagged blunder gets a `category`, plus `categories` (everything that
matched) and `categoryDetails` (what each detector found). `shared/classify.js`
does the work, using only the position, the engine's preferred move, and the
clocks in the PGN.

- **Hanging piece** — after the move, the opponent can win material. Decided by
  a static exchange evaluation that plays the capture sequence out with the
  least valuable attacker first, so a defended piece isn't mistaken for a free
  one. Uses legal moves, which means pinned defenders are correctly treated as
  unable to recapture.
- **Missed tactic** — the engine's preferred move was a recognisable tactic:
  a fork (two or more worthwhile targets, where "worthwhile" means undefended
  or worth more than the attacker), a pin or skewer (two enemy pieces on one
  ray), a discovered attack (moving away unveils another piece's attack), or a
  capture that plainly wins material.
- **King safety** — the king is still on d/e near its home rank past move 15,
  or it's short of defenders with enemy pressure on the squares around it.
  Checked in the position *after* the move as well as before, since a move can
  be what walks the king into the open. Requires the opponent to still have a
  queen or two pieces, so endgames with naturally bare kings don't trip it.
- **Time trouble** — the clock was under 10% of the starting time (floor 10s)
  when the move was played. Correspondence games never qualify.

When several match, `category` picks by priority: hanging piece, missed
tactic, king safety, time trouble — most concrete explanation first. The one
exception is severe time trouble (under 10 seconds), which takes precedence,
because at that point the clock explains the move better than the board does.
Blunders that match nothing are `unclassified` rather than forced into a
category that doesn't fit.

**How much to trust each one.** Hanging piece is the most reliable — it's a
concrete material calculation. Missed tactic is reliable when it fires, since
it names a specific pattern in a specific move. King safety is the softest: it
describes the situation rather than proving causation, so when it's the *only*
category that matched, read it as context rather than a diagnosis. Time
trouble is factual about the clock but says nothing about the position.

## Weekly report and coach voices

`shared/weekly.js` rolls a set of analysed games into one period's numbers —
totals, per-category counts, top focus area, record, worst game — counting
only the player's own blunders, not their opponent's. `shared/coach.js` turns
that summary into a 3-5 sentence written report in one of three voices.

```bash
npm run report -- vb_vic11                    # all three voices
npm run report -- vb_vic11 --coach mentor     # one voice
npm run report -- vb_vic11 --json             # the summary JSON only
npm run report -- vb_vic11 --games 10 --days 30
```

The voices are `mentor` (encouraging, frames mistakes as growth),
`drill_sergeant` (blunt, no sugar-coating) and `analyst` (dry, data-first).
All three report the same facts; only the framing changes, and the advice is
chosen from the week's top category so it stays specific.

The text is composed from templates, not generated by a language model. This
app ships as static files with no backend and no API key, so there's nothing
to call — and templates make the output deterministic, which is what lets the
tests assert on sentence count and wording.

Period wording follows the actual window: a 7-day summary says "this week",
a 30-day one doesn't.

### A caveat on repeatability

Stockfish's evaluation of the same position can shift slightly between runs,
because its hash table carries state from the positions analysed before it.
Moves that land very close to the threshold may flag on one run and not the
next. Higher depth makes results steadier. The browser app uses depth 10 to
stay quick on a phone; the CLI defaults to 12.

## Notes on the Chess.com API

No API key or account needed. Two things to know:

- It returns **403 without a `User-Agent`**, so `shared/chesscom.js` sends one
  **from Node only**. Browsers must not: `User-Agent` is a forbidden header
  there, and while Chrome quietly drops it, WebKit (every browser on iOS) can
  reject the request outright. Sending it also risks triggering a CORS
  preflight, and Chess.com's preflight permits only `Origin` — so a
  preflighted request gets refused.
- It sends `Access-Control-Allow-Origin: *`, which is what makes the
  no-backend version possible.

Games come back **newest first**, exactly as the API sends them. Chess.com
only exposes games one month at a time, so `fetchRecentGames` walks monthly
archives backwards from the current month until it has enough.
