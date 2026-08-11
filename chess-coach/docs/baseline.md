# Where the tier baseline comes from

The tiers in `shared/tier.js` compare a player's blunder rate against what
players at their rating actually do. This is the measurement those numbers
came from, so the ladder can be checked rather than taken on trust.

## What was measured

**399 games from 81 Chess.com players**, analysed by this repo's own pipeline
— same Stockfish, same depth 10, same 2.5-pawn swing threshold, same
White-relative normalisation — so the baseline is in exactly the units the app
grades you in. Only the player's own moves and own blunders were counted.

Players were sampled from the all-time member list of a large public club
(`team-usa`, 3,466 members), shuffled with a fixed seed, and bucketed by the
rating on their profile until each band had candidates. For each player, up to
5 recent **rated, non-daily** games were taken from whichever time class they
had played most of recently, so a single player never straddles two rating
pools. The rating recorded for each game is the one Chess.com reported for
that player in that game, not their profile rating.

Reproduce it with:

```bash
node docs/measure-baseline.mjs 5      # writes docs/baseline-games.json
node docs/fit-baseline.mjs            # prints the tables and the fit
```

`docs/baseline-games.json` is the raw result: one row per game, with the
player, pool, rating, their move count and their blunder count.

## What it found

| rating | players | games | moves | blunders | per game | per 100 moves |
|---|---|---|---|---|---|---|
| 0–200 | 2 | 10 | 162 | 15 | 1.50 | 9.26 |
| 200–400 | 8 | 34 | 962 | 96 | 2.82 | 9.98 |
| 400–600 | 7 | 30 | 969 | 82 | 2.73 | 8.46 |
| 600–800 | 7 | 24 | 663 | 71 | 2.96 | 10.71 |
| 800–1000 | 17 | 66 | 2056 | 138 | 2.09 | 6.71 |
| 1000–1200 | 18 | 69 | 2104 | 134 | 1.94 | 6.37 |
| 1200–1400 | 12 | 42 | 1478 | 122 | 2.90 | 8.25 |
| 1400–1600 | 13 | 48 | 1607 | 69 | 1.44 | 4.29 |
| 1600–1800 | 6 | 26 | 978 | 49 | 1.88 | 5.01 |
| 1800–2000 | 6 | 30 | 1219 | 33 | 1.10 | 2.71 |
| 2000–2200 | 1 | 4 | 166 | 3 | 0.75 | 1.81 |
| 2200–2400 | 3 | 11 | 382 | 12 | 1.09 | 3.14 |
| 2400–2600 | 1 | 5 | 257 | 12 | 2.40 | 4.67 |

**Blunders per game barely moves with rating; blunders per move moves a lot.**
That is the main thing this measurement changed about the design. Stronger
players play longer games — 31 of their own moves a game around 900, 41 around
1900 — so a per-game rate quietly charges you for the length of your games.
Per 100 moves the trend is clean; per game it is mostly noise.

Weighted least squares over the bins holding 15 games or more (9 bins, 369
games), weighted by games per bin:

```
per 100 moves = 11.26 − 0.00409 × rating        weighted R² = 0.72
              ≈ 0.82 fewer blunders per 100 moves for every 200 rating points
```

`EXPECTED` in `tier.js` is that line sampled every 200 points from 300 to
1900, clamped at both ends. The app multiplies it back out by the player's own
moves per game, so the number shown on screen is still "blunders a game" — the
unit the rest of the app uses — but the comparison underneath is per move.

## What the ladder does to this sample

Scoring all 81 sampled players through `tierFor` with the shipped boundaries:

| tier | players | share |
|---|---|---|
| Diamond | 13 | 16% |
| Platinum | 17 | 21% |
| Gold | 20 | 25% |
| Silver | 15 | 19% |
| Bronze | 16 | 20% |

The median player sits at 0.94× expected, which is Gold — the middle rung of
five. The boundaries were chosen before this was checked, so the even spread
is a result rather than a fit.

## What this is not

- **It is a modest sample.** 81 players is enough to establish the slope and
  set sane boundaries. It is not enough to make any single 200-point bin
  authoritative — 1200–1400 measured 8.25 per 100 moves while 1400–1600
  measured 4.29, which is sampling noise, not a cliff. The fitted line is used
  precisely because individual bins are this noisy.
- **It is not split by time control.** Bullet, blitz and rapid are pooled,
  and the per-pool tables in `fit-baseline.mjs` show bullet players blundering
  noticeably more. A bullet regular will therefore rank lower than their rapid
  self. Splitting the curve three ways needs several times this sample.
- **It is one slice of one site.** Members of one large club, sampled once,
  in August 2026. Chess.com ratings also do not mean the same thing as FIDE
  or Lichess ratings.
- **Above 1900 and below 300 it is clamped, not extrapolated.** The sample
  says almost nothing about 2400s, and inventing a number there would be
  worse than admitting the curve has ends.

Re-running the two scripts above with a bigger `players.json` is the way to
tighten any of this.
