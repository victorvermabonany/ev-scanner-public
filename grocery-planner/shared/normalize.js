// Turning "1 medium yellow onion, diced" into something you can add up.
//
// Recipe text is written for people. The pricing engine needs a food key, a
// number, and a unit that matches how the store sells the thing. This module
// is the translation layer, and it is deliberately strict about one thing: an
// ingredient it cannot identify is returned as unmatched rather than guessed
// at, because a wrong match on an allergen-bearing food is the worst bug this
// app could have.

import { FOODS, FOOD_LOOKUP, getFood } from './foods.js';
import { canonicalUnit, cleanUnit, toCanonical, unitKind } from './units.js';

// Words that describe preparation or size rather than the food itself. They
// are stripped before lookup, but only as whole words, so "green onion" and
// "chopped onion" don't collapse into the same thing by accident.
const MODIFIERS = new Set([
  'fresh', 'freshly', 'frozen', 'dried', 'chopped', 'diced', 'minced', 'sliced',
  'shredded', 'grated', 'crumbled', 'cubed', 'halved', 'quartered', 'peeled',
  'seeded', 'trimmed', 'rinsed', 'drained', 'cooked', 'uncooked', 'raw', 'ripe',
  'large', 'medium', 'small', 'extra', 'jumbo', 'thinly', 'roughly', 'coarsely',
  'boneless', 'skinless', 'lean', 'low', 'reduced', 'sodium', 'fat', 'free',
  'unsalted', 'salted', 'plain', 'whole', 'organic', 'optional', 'divided',
  'to', 'taste', 'for', 'serving', 'garnish', 'plus', 'more', 'about', 'good',
  'quality', 'best', 'store', 'bought', 'homemade', 'warm', 'room', 'temperature',
]);

/** Lowercase, drop parentheticals and punctuation, collapse whitespace. */
function tidy(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const withoutModifiers = (text) =>
  text
    .split(' ')
    .filter((word) => !MODIFIERS.has(word))
    .join(' ')
    .trim();

/**
 * The food a recipe line is talking about, or null.
 *
 * Four passes, cheapest first: exact name, name minus preparation words,
 * whole-phrase containment, then a singular/plural retry. Containment is
 * checked longest-alias-first so "green onion" wins over "onion".
 */
export function matchFood(name) {
  const text = tidy(name);
  if (!text) return null;

  const candidates = [text, withoutModifiers(text)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const exact = FOOD_LOOKUP.find(([alias]) => alias === candidate);
    if (exact) return getFood(exact[1]);
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    const contained = FOOD_LOOKUP.find(([alias]) => {
      // Whole-word containment only: "cream" must not match inside "ice cream".
      const pattern = new RegExp(`(^|\\s)${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`);
      return pattern.test(candidate);
    });
    if (contained) return getFood(contained[1]);
  }

  // Last resort: naive de-pluralisation of the head noun.
  const singular = text.replace(/(\w+)s(\s|$)/g, '$1$2').trim();
  if (singular !== text) return matchFood(singular);

  return null;
}

// Volume-to-weight for the foods recipes measure in cups but shops sell by
// weight. Approximations — a packed cup of brown sugar is not a level one —
// which is fine here because they feed a package count that gets rounded up
// anyway. Anything not listed falls back to DEFAULT_GRAMS_PER_CUP.
const GRAMS_PER_CUP = {
  white_rice: 185, brown_rice: 190, quinoa: 170, rolled_oats: 90, flour: 120,
  brown_sugar: 200, lentils: 200, breadcrumbs: 50, couscous: 180,
  cheddar: 113, mozzarella: 113, parmesan: 90, feta: 150,
  black_beans: 170, chickpeas: 165, kidney_beans: 175, white_beans: 175,
  frozen_corn: 150, frozen_peas: 145, frozen_broccoli: 90, frozen_edamame: 155,
  frozen_spinach: 190, frozen_stirfry_veg: 130,
  baby_spinach: 30, kale: 40, broccoli: 90, mushroom: 70, cherry_tomato: 150,
  carrot: 128, cabbage: 90, green_beans: 110, romaine: 50, cilantro: 16,
  parsley: 16, basil: 24, green_onion: 100, yellow_onion: 160, red_onion: 160,
  bell_pepper: 150, roma_tomato: 180, celery: 100, zucchini: 125, tortilla_chips: 30,
  peanut_butter: 258, honey: 340, salt: 273, chicken_breast: 140, chicken_thigh: 140,
};

const DEFAULT_GRAMS_PER_CUP = 200;
const ML_PER_CUP = 236.5882365;

/** Which measurement kind this food's packages are sold in. */
export function packKind(food) {
  const first = food?.packs?.[0];
  return first ? unitKind(first.unit) : null;
}

/**
 * Convert a canonical amount into the kind the store sells this food in.
 *
 * Returns null when the bridge doesn't exist — a count of something with no
 * known unit weight, say — so callers can flag it rather than invent a number.
 */
export function toPackKind(food, canonical) {
  const target = packKind(food);
  if (!canonical || !target) return null;
  if (canonical.kind === target) return { ...canonical, approximate: false };

  const gramsPerCup = GRAMS_PER_CUP[food.key] ?? DEFAULT_GRAMS_PER_CUP;
  const approximate = !(food.key in GRAMS_PER_CUP);

  // count → weight/volume, via the food's own "one of them is this big"
  if (canonical.kind === 'count') {
    if (target === 'weight' && food.gramsPerEach) {
      return { amount: canonical.amount * food.gramsPerEach, kind: 'weight', unit: 'g', approximate: false };
    }
    if (target === 'volume' && food.mlPerEach) {
      return { amount: canonical.amount * food.mlPerEach, kind: 'volume', unit: 'ml', approximate: false };
    }
    return null;
  }

  // weight/volume → count, the same bridge in reverse
  if (target === 'count') {
    if (canonical.kind === 'weight' && food.gramsPerEach) {
      return { amount: canonical.amount / food.gramsPerEach, kind: 'count', unit: 'each', approximate: false };
    }
    if (canonical.kind === 'volume' && food.mlPerEach) {
      return { amount: canonical.amount / food.mlPerEach, kind: 'count', unit: 'each', approximate: false };
    }
    return null;
  }

  // volume → weight and back, using the per-cup density above
  if (canonical.kind === 'volume' && target === 'weight') {
    return {
      amount: (canonical.amount / ML_PER_CUP) * gramsPerCup,
      kind: 'weight', unit: 'g', approximate,
    };
  }
  return {
    amount: (canonical.amount / gramsPerCup) * ML_PER_CUP,
    kind: 'volume', unit: 'ml', approximate,
  };
}

/**
 * One recipe ingredient, normalised.
 *
 * `matched: false` means the app could not identify the food. Those are shown
 * to the user as unmatched rather than being silently dropped or priced — see
 * the "unmatched products" count on the grocery list.
 */
export function normalizeIngredient(ingredient) {
  const rawName = ingredient?.name ?? '';
  const food = matchFood(rawName);
  const quantity = Number(ingredient?.quantity);
  const unit = cleanUnit(ingredient?.unit);
  const canonical = toCanonical(Number.isFinite(quantity) ? quantity : 1, unit || 'each');

  return {
    raw: String(rawName).trim(),
    key: food?.key ?? null,
    matched: Boolean(food),
    displayName: food?.name ?? String(rawName).trim(),
    category: food?.category ?? 'Other',
    allergens: food?.allergens ?? [],
    diet: food?.diet ?? null,
    optional: Boolean(ingredient?.optional),
    quantity: Number.isFinite(quantity) ? quantity : null,
    unit: unit || 'each',
    canonical: canonical ?? { amount: 1, kind: 'count', unit: canonicalUnit('count') },
    // Pack-kind amount is what the pricing engine actually buys against.
    packAmount: food ? toPackKind(food, canonical) : null,
  };
}

/** Every food whose name or aliases contain the query — used by the pantry picker. */
export function searchFoods(query, limit = 12) {
  const text = tidy(query);
  if (!text) return [];
  const hits = FOODS.filter(
    (food) =>
      food.name.toLowerCase().includes(text) ||
      food.key.replace(/_/g, ' ').includes(text) ||
      food.aliases.some((alias) => alias.includes(text))
  );
  return hits.slice(0, limit);
}
