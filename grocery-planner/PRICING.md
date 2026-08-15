# Where the prices come from

This is the part of the build worth being explicit about, because the product's
whole claim rests on it.

## What ships today

V1 ships **one pricing provider: a bundled price snapshot**, built from the
package sizes and prices in `shared/foods.js` and scaled per store location by
a price index (retailer positioning × local cost of living).

It is not a live retailer feed. There is no commercial catalog API wired up,
and I did not have credentials for one, so rather than pretend otherwise the
snapshot is labelled as what it is everywhere it appears:

- every provider reports `mode: 'estimate'` and a `lastRefreshed` date,
- every plan and grocery list carries the disclosure line from PRD §17,
- a store with no catalog at all uses `createEstimateCatalog`, which reports
  `mode: 'unpriced-estimate'` and warns that the total may differ
  *significantly*.

The retailers in `shared/stores.js` — Valu Foods, Northside Market, GreenLeaf
Market — are fictional on purpose. Putting a real supermarket's name next to a
price that came from a bundled snapshot would imply live data the build does
not have.

## The seam

`shared/catalog.js` is the only file that knows where a price comes from.
Everything above it asks a provider for products and takes what it gets:

```js
const catalog = catalogFor(store);

catalog.meta()          // { mode, providerName, lastRefreshed, disclosure }
catalog.search(foodKey) // candidate products for that food
catalog.product(id)     // one product by id
```

A product is: `{ id, name, brand, packageSize, packageUnit, packageAmount,
price, salePrice, available, allergens, providerRef, lastUpdated }`.

To wire in a real retailer, write a fourth provider with those three methods and
have `catalogFor` return it. Two things to know:

1. **`packageAmount` must be in the food's canonical measure.** Foods can be
   sold in mixed units (onions loose *and* by the 3 lb bag); the snapshot
   provider converts every package into one measure per food via
   `toPackKind()`. A live provider must do the same, or the package maths will
   divide pounds into onions.
2. **A network provider will need to be async.** The planner calls
   `catalog.search()` synchronously today, which keeps plan generation a pure
   function and makes the tests trivial. Making `search` return a promise means
   awaiting it in `pricing.js` and `planner.js` — those are the only two call
   sites — or pre-fetching every candidate product before pricing, which keeps
   the pure core intact and is the approach I'd take.

**Allergens are part of the contract.** The snapshot supplies each product's
allergen tags from the food table. A provider that cannot supply them should
return `allergens: null` rather than `[]` — `safety.js` flags a product with
unknown allergen data for the user to check, and treating "unknown" as "none"
is exactly the failure this app must not have.

## Rules the pricing layer enforces

These hold regardless of which provider is behind them:

- **Whole packages.** A recipe using half a bag charges the basket for the bag.
  `packagesFor()` rounds up, always.
- **Reasonable pack sizes.** The default pass won't buy a 5 lb bag for one cup;
  it prefers the everyday pack unless that means buying an absurd number of
  them. The budget optimiser is allowed to drop that rule (`mode: 'economy'`)
  and does so as the first rung of the ladder, which is why "switched to a
  cheaper pack size" shows up in the plan's list of changes.
- **Unpriced is visible.** An ingredient the store doesn't carry stays on the
  list without a price, `totals.fullyPriced` goes false, and no screen is
  allowed to claim the plan is under budget — only that the priced part of it
  is.
- **A model never sets a price.** `schema.js` strips price, cost, total,
  availability and product-id fields from model output before it is read.
- **The buffer.** The optimiser aims at 93% of the stated budget, not 100%, so
  variable-weight products and price drift land inside the number rather than
  outside it.
