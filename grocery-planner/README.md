# AI Grocery Planner

A week of dinners planned backwards from a real budget: pick your store, say
what you can spend and how you eat, get recipes and one grocery list you can
actually shop from.

**Live:** https://victorvermabonany.github.io/ev-scanner-public/grocery/

The thing that makes this different from asking a chatbot for meal ideas is
that a model never touches a number. It writes recipes from a fixed ingredient
vocabulary; code normalises the ingredients, consolidates them, matches them to
store products, counts whole packages, adds it up, and revises the plan when
the basket comes in over target. Half a $4 bag of cheese costs the basket
$4.00, because you cannot buy half a bag.

## How it's put together

The app runs entirely in the browser. There is no backend to deploy, pay for or
keep awake, which is why it can live on GitHub Pages.

```
grocery-planner/
├── shared/               pure logic — no DOM, no network
│   ├── units.js          the only file allowed to do measurement
│   ├── foods.js          ~110 ingredients: aliases, allergens, packages
│   ├── normalize.js      "1 medium yellow onion, diced" → a food + an amount
│   ├── consolidate.js    one line per food, across the whole week
│   ├── stores.js         supported retailers and ZIP coverage
│   ├── catalog.js        the pricing seam (see PRICING.md)
│   ├── pricing.js        package maths and basket totals
│   ├── budget.js         the buffer, feasibility, the optimisation ladder
│   ├── safety.js         allergy and diet validation — hard constraints
│   ├── recipes.js        the built-in recipe bank
│   ├── compose.js        choosing a week that reuses its own ingredients
│   ├── schema.js         validates model output, strips price claims
│   ├── ai.js             the prompt and the response schema
│   └── planner.js        the pipeline: generate → validate → price → revise
├── client/               the React app — this is what gets deployed
│   └── src/
│       ├── screens/      landing, planner, generating, plan, meal, list,
│       │                 saved plans, preferences
│       └── lib/          storage, analytics, the Anthropic call
└── tests/                node:test suite over shared/
```

`shared/` is deliberately free of React and of `fetch`. A plan is a pure
function of the questionnaire answers, the food table and the catalog, which is
why the tests can generate whole weeks and assert on them without mocking
anything.

## Setup

Requires Node.js 18+ (tested on 22).

```bash
cd grocery-planner
npm run install:all
npm test          # 59 tests over the planning engine
npm run dev       # http://localhost:5174
```

## Recipes: with or without an API key

Both paths produce a complete plan; only who writes the recipes changes.

| | No API key | With an API key |
|---|---|---|
| Recipes | 30 built-in dinners | Written for your household by Claude |
| Pricing, list, swapping, budget | identical | identical |

Add a key under **Preferences → Recipe generation**. It is stored in that
browser's `localStorage` and sent only to `api.anthropic.com`; the request is
made from the browser rather than proxied, so the key never reaches a server of
ours. If a call fails — bad key, rate limit, offline — the app falls back to the
recipe bank, says so on the plan, and keeps every questionnaire answer.

The model is given a fixed ingredient vocabulary (the names in `foods.js`) and
asked for structured JSON. `schema.js` then strips anything price-, cost-,
availability- or "allergy-safe"-shaped from the reply before it is read, so a
model cannot put a number in front of a user even if it volunteers one. There's
a test for that.

## Allergies

Allergies are the one thing in this app that never bends. They're stored as
tags on each food, not as a sentence in a prompt: every generated meal is
re-checked against them in code, a meal that fails is dropped rather than
adjusted, and an ingredient the app cannot identify is treated as a blocker
whenever the household has any allergy at all. Matched products are checked
again after pricing, since product matching can introduce an allergen the
recipe didn't have.

That is still not a guarantee, and the app says so on screen: packaging
changes, and the label on the jar is the authority.

## Deploying

The built app is committed to `/grocery` at the repo root, and GitHub Pages
serves it from there.

```bash
npm run build:pages    # builds and copies client/dist → ../grocery
git add ../grocery && git commit -m "Deploy grocery planner"
```

Optional analytics (off by default, Plausible, no third-party requests until
you set it):

```bash
VITE_ANALYTICS_DOMAIN=example.com npm run build:pages
```

Only the funnel events in `client/src/lib/analytics.js` are sent, and the
`track` helper drops any property not on its allow-list — allergies, ZIP codes
and email addresses can't leak into an event by accident.

## What's deliberately not here

Delivery and checkout, native apps, multi-store baskets, receipt or barcode
scanning, breakfast and lunch, and anything resembling medical nutrition
advice. See `PRICING.md` for the one significant compromise in the V1 build:
where the prices come from.
