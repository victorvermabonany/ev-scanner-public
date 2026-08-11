# Intention

Two screens: a daily check-in, and a count of days of intention.

There is one question a day — *how did the day go?* — with three answers that
describe a day rather than grade it. The home screen shows how many days have
passed since the last one that got away from you.

No accounts, no login. One person's history, kept in a JSON file on the
machine running the server.

## Running it

```bash
npm run install:all   # root, client and server
npm run dev           # Vite on :5273, API on :3101
```

Open http://localhost:5273. The Vite dev server proxies `/api/*` to the Node
server, so there is only one URL to use.

For a single-process build:

```bash
npm run build   # client → client/dist
npm start       # Node serves the API and the built app on :3101
```

```bash
npm test        # the streak rules
```

## How the count works

`shared/streak.js` holds the only real logic in the app, and both the server
and the client import it.

**Days of intention** is the run of days since the last `slipped` check-in,
counted from the calendar rather than from the check-ins:

- Only an explicit **slipped** resets it. A day you forgot to open the app is
  not a day you slipped — if a missed entry broke the count, the app would
  become the thing you were keeping up with, instead of the intention.
- **Strong** and **struggling** both keep the run alive. Struggling is not a
  half-failure; on most days it is the harder of the two.
- A slip resets to zero *on the day itself*, so the day it happened reads as
  zero and tomorrow starts again at one.
- With no slip on record, the count runs from the first check-in, inclusive.

One check-in per day. Answering again replaces the day rather than adding to
it, so changing your mind about today is not a second event.

## Layout

```
shared/streak.js     the count, and the dates it is built from
server/index.js      two endpoints: read the summary, record a day
server/store.js      the JSON file, swap this out when accounts arrive
client/src/screens/  Home and CheckIn
client/src/lib/      the wording of the three answers, and the fetch calls
```

## Design notes

Serif headlines (Newsreader) against a sans body (Inter), both vendored as
latin subsets so the app makes no external requests. The background is a wash
between three warm neutrals rather than a flat fill, and nothing on screen is
pure white, pure black, or square-cornered.

The three answers share one icon — a ring, drawn whole, dashed, or scattered.
Same shape and weight in all three, so they read as three states of a day
rather than a tick, a warning and a cross.
