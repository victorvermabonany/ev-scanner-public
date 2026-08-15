// The pricing seam.
//
// Everything above this file asks a *catalog provider* for products and takes
// prices from whatever it returns. It never computes a price itself, and the
// language model never supplies one — the AI writes recipes, code buys them.
//
// V1 ships one provider: a bundled snapshot built from foods.js, scaled by the
// store's price index. It is honest about what it is (`mode: 'estimate'`), and
// the UI labels any plan priced from it accordingly. A real retailer API is a
// second provider with the same three methods:
//
//     search(foodKey)  → candidate products for that food
//     product(id)      → one product by id
//     meta()           → { mode, lastRefreshed, providerName }
//
// Nothing else in the app needs to change to switch.

import { FOODS, getFood } from './foods.js';
import { RETAILER_BY_ID } from './stores.js';
import { toCanonical } from './units.js';
import { packKind, toPackKind } from './normalize.js';

/** When the bundled price snapshot was taken. Shown wherever prices appear. */
export const SNAPSHOT_DATE = '2026-08-01';

const round = (n) => Math.round(n * 100) / 100;

/**
 * Build the product rows a store carries for one food.
 *
 * A product is a food's pack plus the store's price for it — the shape the
 * pricing engine reasons about: name, brand, package size, price, availability.
 */
function productsFor(store, food) {
  const retailer = RETAILER_BY_ID.get(store.retailerId);
  const unavailable = retailer?.gaps?.includes(food.key) ?? false;

  return food.packs.map((pack, index) => {
    // A food's packages can be labelled in different measures — onions loose
    // and by the bag — so every one is converted into the food's own canonical
    // measure. The label the shopper sees stays as printed.
    const canonical = toPackKind(food, toCanonical(pack.size, pack.unit));
    return {
      id: `${store.id}:${food.key}:${index}`,
      foodKey: food.key,
      storeId: store.id,
      name: food.name,
      brand: pack.label,
      packageSize: pack.size,
      packageUnit: pack.unit,
      // Canonical size is what the package maths divides into.
      packageAmount: canonical?.amount ?? null,
      packageKind: canonical?.kind ?? packKind(food),
      price: round(pack.price * store.priceIndex),
      salePrice: null,
      available: !unavailable,
      // The snapshot carries the food table's allergen tags. A live provider
      // that can't supply them should leave this null, which makes the safety
      // check flag the product instead of clearing it.
      allergens: food.allergens,
      category: food.category,
      providerRef: `snapshot:${SNAPSHOT_DATE}:${food.key}:${index}`,
      lastUpdated: SNAPSHOT_DATE,
    };
  });
}

/**
 * A catalog provider backed by the bundled snapshot.
 *
 * Synchronous by design so plan generation stays a pure function of its
 * inputs; a network-backed provider would return promises and the planner
 * would await them, which is the only change that requires.
 */
export function createSnapshotCatalog(store) {
  const cache = new Map();

  return {
    meta: () => ({
      mode: 'estimate',
      providerName: 'Bundled price snapshot',
      lastRefreshed: SNAPSHOT_DATE,
      storeId: store.id,
      storeName: store.name,
      disclosure:
        'Estimated subtotal based on a bundled product snapshot, not live store data. ' +
        'In-store prices and availability may differ.',
    }),

    search(foodKey) {
      if (cache.has(foodKey)) return cache.get(foodKey);
      const food = getFood(foodKey);
      const rows = food ? productsFor(store, food) : [];
      cache.set(foodKey, rows);
      return rows;
    },

    product(id) {
      const foodKey = String(id).split(':')[1];
      return this.search(foodKey).find((product) => product.id === id) ?? null;
    },

    /** Only used by the "what does this store carry" debug view. */
    all: () => FOODS.flatMap((food) => productsFor(store, food)),
  };
}

/**
 * Estimate-only provider for a store we have no catalog for.
 *
 * Kept deliberately separate from the snapshot provider: same numbers, but
 * `mode: 'unpriced-estimate'` travels with every total so the interface can
 * say plainly that this is a general estimate rather than a store price.
 */
export function createEstimateCatalog(store) {
  const inner = createSnapshotCatalog({ ...store, priceIndex: 1 });
  return {
    ...inner,
    meta: () => ({
      mode: 'unpriced-estimate',
      providerName: 'National average estimate',
      lastRefreshed: SNAPSHOT_DATE,
      storeId: store?.id ?? null,
      storeName: store?.name ?? 'Unsupported store',
      disclosure:
        'This store has no connected catalog, so these are general national-average ' +
        'estimates rather than store prices. Your actual total may differ significantly.',
    }),
  };
}

/** Pick the right provider for a store. */
export const catalogFor = (store) =>
  store && store.catalogProvider === 'bundled-snapshot'
    ? createSnapshotCatalog(store)
    : createEstimateCatalog(store);
