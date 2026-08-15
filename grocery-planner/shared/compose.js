// Choosing which dinners go in the week.
//
// The interesting constraint isn't "find good recipes" — it's that a week of
// individually good recipes is a bad plan. Five dinners with nothing in common
// means five half-used bags of things. So candidates are scored on how much
// they share with what's already in the basket, and penalised for repeating a
// protein or a cuisine too often. That tension is the whole product.

import { RECIPES } from './recipes.js';
import { NUTRITION_BY_ID } from './recipes.js';
import { mealIsAcceptable, mealIsSafe } from './safety.js';
import { matchFood } from './normalize.js';
import { getFood } from './foods.js';

/** Deterministic PRNG, so a plan can be reproduced and "regenerate" can differ. */
export function rng(seed) {
  let state = 0;
  for (const char of String(seed)) state = (state * 31 + char.charCodeAt(0)) >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The food keys a recipe needs, ignoring anything we can't identify. */
export function foodKeysOf(recipe) {
  const keys = new Set();
  for (const ingredient of recipe.ingredients ?? []) {
    const food = matchFood(ingredient.name);
    if (food) keys.add(food.key);
  }
  return keys;
}

/** The recipe's headline protein, used for variety checks. */
export function proteinOf(recipe) {
  for (const ingredient of recipe.ingredients ?? []) {
    const food = matchFood(ingredient.name);
    if (food?.isProtein) return food.key;
  }
  return null;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Recipes this household can actually eat, within their time limit. */
export function eligibleRecipes(constraints, pool = RECIPES) {
  const maxMinutes = constraints.maxCookMinutes ?? 999;
  return pool.filter((recipe) => {
    if (recipe.totalTimeMinutes > maxMinutes) return false;
    return mealIsAcceptable(recipe, constraints);
  });
}

/**
 * How well this recipe fits, given what's already chosen.
 *
 * Overlap is worth more than style: a plan that nails "high protein" but
 * shares nothing across five dinners costs more and wastes more than one that
 * compromises slightly and reuses the chicken.
 */
export function scoreRecipe(recipe, { basket, chosen, style, cuisines = [], preferCheap = false }) {
  const keys = foodKeysOf(recipe);
  let overlap = 0;
  for (const key of keys) {
    if (!basket.has(key)) continue;
    const food = getFood(key);
    // Reusing a $9 protein matters far more than reusing the salt.
    overlap += food?.isProtein ? 3 : food?.category === 'Spices and seasonings' ? 0.25 : 1;
  }

  const styleScore = (NUTRITION_BY_ID.get(style)?.score ?? (() => 0))(recipe);

  const proteins = chosen.map(proteinOf).filter(Boolean);
  const protein = proteinOf(recipe);
  const proteinCount = protein ? proteins.filter((p) => p === protein).length : 0;
  // Two meals off the same protein is efficient. Three starts to feel like a
  // punishment, so the penalty ramps hard after that.
  const repetition = proteinCount >= 2 ? -6 * (proteinCount - 1) : 0;

  const cuisineCount = chosen.filter((meal) => meal.cuisine === recipe.cuisine).length;
  const cuisineRepeat = cuisineCount >= 2 ? -3 * (cuisineCount - 1) : 0;
  const cuisineWanted = cuisines.length > 0 && cuisines.includes(recipe.cuisine) ? 3 : 0;

  const cheap = preferCheap ? ({ low: 5, mid: 0, high: -6 })[recipe.costTier] ?? 0 : 0;

  return overlap * 1.6 + styleScore + repetition + cuisineRepeat + cuisineWanted + cheap;
}

/**
 * Pick `count` dinners.
 *
 * Greedy rather than exhaustive: each pick takes the best-scoring candidate
 * given everything already chosen, with a small random tie-break so
 * "regenerate" produces a genuinely different week rather than the same one.
 */
export function composeMeals(count, constraints, options = {}) {
  const {
    seed = 'plan',
    pool = RECIPES,
    exclude = [],
    preferCheap = false,
    pantryKeys = [],
  } = options;

  const random = rng(seed);
  const excluded = new Set(exclude);
  const candidates = eligibleRecipes(constraints, pool).filter((r) => !excluded.has(r.id));

  const chosen = [];
  // Pantry items are already "in the basket" as far as overlap is concerned.
  const basket = new Set(pantryKeys);

  while (chosen.length < count && candidates.length > 0) {
    const scored = candidates
      .filter((recipe) => !chosen.some((meal) => meal.id === recipe.id))
      .map((recipe) => ({
        recipe,
        score:
          scoreRecipe(recipe, {
            basket,
            chosen,
            style: constraints.nutritionStyle,
            cuisines: constraints.cuisines,
            preferCheap,
          }) +
          random() * 1.5,
      }))
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) break;
    const pick = scored[0].recipe;
    chosen.push(pick);
    for (const key of foodKeysOf(pick)) basket.add(key);
  }

  return chosen;
}

/**
 * Turn chosen recipes into plan meals: days, servings, ids.
 *
 * The id identifies the *slot* in the week, not the recipe in it. Swapping
 * Tuesday's dinner changes what's on Tuesday, not which thing you were
 * looking at — so a screen holding a meal id keeps working across a swap.
 */
export function toPlanMeals(recipes, { servingsPerMeal, dayOffset = 0 }) {
  return recipes.map((recipe, index) => ({
    ...recipe,
    id: `slot-${index}`,
    recipeId: recipe.id,
    day: DAYS[(index + dayOffset) % DAYS.length],
    servings: servingsPerMeal,
    baseServings: recipe.baseServings ?? 2,
  }));
}

/**
 * Three alternatives for one meal.
 *
 * Ranked by overlap with the *rest* of the plan, so a swap tends to reuse what
 * is already being bought rather than adding a new shopping list of its own.
 */
export function alternativesFor(plan, mealId, constraints, { pool = RECIPES, limit = 3 } = {}) {
  const others = plan.meals.filter((meal) => meal.id !== mealId);
  const basket = new Set();
  for (const meal of others) for (const key of foodKeysOf(meal)) basket.add(key);

  const used = new Set(plan.meals.map((meal) => meal.recipeId ?? meal.id));

  return eligibleRecipes(constraints, pool)
    .filter((recipe) => !used.has(recipe.id))
    .map((recipe) => ({
      recipe,
      score: scoreRecipe(recipe, {
        basket,
        chosen: others,
        style: constraints.nutritionStyle,
        cuisines: constraints.cuisines,
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.recipe);
}

/** Safety net: any bank recipe that clears the hard constraints. */
export const safeFallbacks = (constraints, pool = RECIPES) =>
  pool.filter((recipe) => mealIsSafe(recipe, constraints));

export { DAYS };
