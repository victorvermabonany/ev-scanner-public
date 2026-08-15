// Package maths and basket totals. All arithmetic lives here, in code.
//
// The rule that makes this app different from asking a chatbot: a recipe that
// uses half a $4 bag of cheese costs the basket $4.00, not $2.00. You cannot
// buy half a bag. Every total below is built from whole packages.

import { fromCanonical } from './units.js';
import { getFood } from './foods.js';

const round = (n) => Math.round(n * 100) / 100;

/**
 * How many packs of this product cover the requirement, and what that costs.
 *
 * `waste` is what's left over afterwards, in canonical units — the optimiser
 * and the "reasonable package" rule both care about it.
 */
export function packagesFor(product, needAmount) {
  if (!product?.packageAmount) return null;
  const count = Math.max(1, Math.ceil(needAmount / product.packageAmount - 1e-9));
  const bought = count * product.packageAmount;
  return {
    count,
    bought,
    waste: bought - needAmount,
    wasteRatio: needAmount > 0 ? (bought - needAmount) / needAmount : 0,
    total: round(count * (product.salePrice ?? product.price)),
  };
}

// A pack is "reasonable" when it doesn't leave you with wildly more than the
// recipe needs. Buying a 5 lb bag of rice for one cup is cheaper per ounce and
// still the wrong answer for someone shopping to a $100 week.
const MAX_REASONABLE_WASTE_RATIO = 1.5;

/**
 * Pick the product to buy.
 *
 * `mode: 'default'` shops the way a person would — the everyday pack, unless
 * that means buying an absurd number of them. `mode: 'economy'` is what the
 * budget optimiser switches to: cheapest total, bulk allowed. Having both is
 * what gives step 1 of the optimisation ladder (§13) something real to do.
 */
export function chooseProduct(products, needAmount, mode = 'default') {
  const available = products.filter((product) => product.available && product.packageAmount);
  if (available.length === 0) return null;

  const options = available
    .map((product) => ({ product, packs: packagesFor(product, needAmount) }))
    .filter((option) => option.packs);

  if (options.length === 0) return null;

  const cheapest = [...options].sort(
    (a, b) => a.packs.total - b.packs.total || a.packs.waste - b.packs.waste
  );

  if (mode === 'economy') return cheapest[0];

  const sensible = options.filter(
    (option) =>
      option.packs.wasteRatio <= MAX_REASONABLE_WASTE_RATIO || option.packs.count === 1
  );
  const pool = sensible.length > 0 ? sensible : options;

  // Prefer the food's everyday pack when it's in the running, so a first pass
  // reads like a normal shop rather than a warehouse run.
  const everyday = pool.find((option) => option.product.brand?.includes('Store brand'));
  const best = [...pool].sort(
    (a, b) => a.packs.total - b.packs.total || a.packs.waste - b.packs.waste
  )[0];

  if (everyday && everyday.packs.total <= best.packs.total * 1.1) return everyday;
  return best;
}

/**
 * Price one consolidated requirement against a store's catalog.
 *
 * Returns a grocery item even when nothing could be matched — an unpriced line
 * has to stay visible, because a basket with holes in it must never be
 * presented as a confirmed under-budget total.
 */
export function priceRequirement(requirement, catalog, { mode = 'default', pantry = false } = {}) {
  const products = catalog.search(requirement.key);
  const chosen = chooseProduct(products, requirement.amount, mode);
  const food = getFood(requirement.key);

  const base = {
    id: `item-${requirement.key}`,
    foodKey: requirement.key,
    name: requirement.displayName,
    category: requirement.category,
    allergens: requirement.allergens,
    requiredAmount: requirement.amount,
    requiredKind: requirement.kind,
    requiredText: fromCanonical(requirement.amount, requirement.kind),
    needText: requirement.needText,
    approximate: requirement.approximate,
    meals: requirement.meals,
    optionalOnly: requirement.optionalOnly,
    pantry,
  };

  if (!chosen) {
    const anyProduct = products[0] ?? null;
    return {
      ...base,
      product: null,
      packageCount: 0,
      unitPrice: null,
      totalPrice: null,
      availability: anyProduct ? 'unavailable' : 'not-carried',
      priced: false,
    };
  }

  const { product, packs } = chosen;
  return {
    ...base,
    product: {
      id: product.id,
      name: product.name,
      brand: product.brand,
      packageSize: product.packageSize,
      packageUnit: product.packageUnit,
      price: product.price,
      salePrice: product.salePrice,
      providerRef: product.providerRef,
      lastUpdated: product.lastUpdated,
      allergens: product.allergens,
    },
    packageCount: packs.count,
    unitPrice: product.salePrice ?? product.price,
    totalPrice: packs.total,
    leftoverText: packs.waste > 0 ? fromCanonical(packs.waste, requirement.kind) : null,
    availability: 'in-stock',
    priced: true,
  };
}

/** Price a whole week. `pantryKeys` are foods the user already has at home. */
export function priceBasket(requirements, catalog, { mode = 'default', pantryKeys = [] } = {}) {
  const owned = new Set(pantryKeys);
  const items = requirements.map((requirement) =>
    priceRequirement(requirement, catalog, { mode, pantry: owned.has(requirement.key) })
  );
  return { items, totals: basketTotals(items) };
}

/**
 * Add a priced basket up.
 *
 * Split out from pricing so the UI can re-total instantly when someone ticks
 * "I already have this", without touching the catalog again.
 */
export function basketTotals(items) {
  let subtotal = 0;
  let pantrySavings = 0;
  let unavailable = 0;
  let unpriced = 0;

  for (const item of items) {
    if (!item.priced) {
      unpriced += 1;
      if (item.availability === 'unavailable') unavailable += 1;
      continue;
    }
    if (item.pantry) pantrySavings += item.totalPrice;
    else subtotal += item.totalPrice;
  }

  return {
    subtotal: round(subtotal),
    pantrySavings: round(pantrySavings),
    productCount: items.filter((item) => !item.pantry && item.priced).length,
    pantryCount: items.filter((item) => item.pantry).length,
    unavailableCount: unavailable,
    unpricedCount: unpriced,
    // The honesty flag. When false, no screen may claim the plan is under
    // budget — only that the priced part of it is.
    fullyPriced: unpriced === 0,
  };
}

/**
 * Split the basket across meals, so each recipe can show what it cost.
 *
 * A package bought once but used by three meals is shared between them in
 * proportion to how much each one uses. Approximate by nature — it's an
 * attribution, not a second price — and it never changes the basket total.
 */
export function costByMeal(items, meals) {
  const totals = new Map(meals.map((meal) => [meal.id, 0]));

  for (const item of items) {
    if (!item.priced || item.pantry || !item.meals?.length) continue;

    // Weight by each meal's share of the requirement.
    const weights = item.meals.map((usage) => ({
      mealId: usage.mealId,
      share: Number(usage.quantity) > 0 ? Number(usage.quantity) : 1,
    }));
    const totalShare = weights.reduce((sum, w) => sum + w.share, 0) || 1;

    for (const weight of weights) {
      if (!totals.has(weight.mealId)) continue;
      totals.set(
        weight.mealId,
        totals.get(weight.mealId) + (item.totalPrice * weight.share) / totalShare
      );
    }
  }

  return new Map([...totals].map(([id, cost]) => [id, round(cost)]));
}

/** Ingredients used by more than one meal — the reuse the plan is judged on. */
export function reuseSummary(items) {
  const shared = items
    .filter((item) => new Set(item.meals?.map((m) => m.mealId)).size > 1)
    .map((item) => ({
      name: item.name,
      mealIds: [...new Set(item.meals.map((m) => m.mealId))],
      mealTitles: [...new Set(item.meals.map((m) => m.mealTitle))],
    }));

  const singleUse = items.filter(
    (item) => !item.pantry && new Set(item.meals?.map((m) => m.mealId)).size === 1
  );

  return { shared, singleUseCount: singleUse.length, singleUse };
}
