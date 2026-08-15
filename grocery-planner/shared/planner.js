// The generation pipeline, in the order the PRD lays it out (§13):
//
//   candidate meals → allergy + diet validation → normalise → consolidate →
//   match products → price the basket → compare to the internal target →
//   revise → validate again → return.
//
// Two rules shape the whole file. The model never touches steps 3 onwards —
// arithmetic, package counts and budget decisions are code. And every change
// the optimiser makes is recorded in `adjustments`, because "we swapped your
// salmon for tilapia" belongs on screen, not in a log file.

import { RECIPES, RECIPE_BY_ID } from './recipes.js';
import { composeMeals, toPlanMeals, alternativesFor, foodKeysOf, proteinOf, DAYS } from './compose.js';
import { consolidate, byCategory } from './consolidate.js';
import { priceBasket, basketTotals, costByMeal, reuseSummary } from './pricing.js';
import { budgetStatus, internalTarget, servingsPerMeal as servingsFor, assessBudget, OPTIMIZATION_STEPS } from './budget.js';
import { mealIsAcceptable, mealAllergens, parseDislikes, validatePlan, safeFoodKeys } from './safety.js';
import { CATEGORIES, getFood } from './foods.js';
import { catalogFor } from './catalog.js';
import { matchFood } from './normalize.js';

export const PLAN_VERSION = 1;

/** Turn questionnaire answers into the constraint object everything else reads. */
export function toConstraints(request) {
  return {
    allergies: request.allergies ?? [],
    diets: request.diets ?? [],
    dislikes: parseDislikes(request.dislikes ?? []),
    dislikeOverrides: request.dislikeOverrides ?? [],
    maxCookMinutes: request.maxCookMinutes ?? 60,
    nutritionStyle: request.nutritionStyle ?? 'balanced',
    cuisines: request.cuisines ?? [],
  };
}

/** Price a set of meals end to end. The one path everything else calls. */
function assemble(meals, context, mode = 'default') {
  const { requirements, unmatched } = consolidate(meals);
  const { items, totals } = priceBasket(requirements, context.catalog, {
    mode,
    pantryKeys: context.pantryKeys,
  });
  return { requirements, unmatched, items, totals, mode };
}

// ---------------------------------------------------------------- optimiser

/** Candidate replacements this household can eat, cheapest-leaning first. */
function replacementPool(meals, context) {
  const used = new Set(meals.map((meal) => meal.recipeId ?? meal.id));
  return RECIPES.filter(
    (recipe) => !used.has(recipe.id) && mealIsAcceptable(recipe, context.constraints)
  );
}

/** Swap one meal out for another, keeping the slot's id, day and servings. */
const replaceMeal = (meals, mealId, recipe) =>
  meals.map((meal) =>
    meal.id === mealId
      ? {
          ...recipe,
          id: meal.id,
          recipeId: recipe.id,
          day: meal.day,
          servings: meal.servings,
          baseServings: recipe.baseServings ?? 2,
        }
      : meal
  );

/**
 * Step 2: trade an expensive ingredient for a cheaper equivalent.
 *
 * Only foods that declare a `cheaperSwap` are eligible, and the swap still has
 * to clear the household's allergies and diet — a cost saving that introduces
 * an allergen is not a saving.
 */
function swapExpensiveIngredients(meals, priced, context) {
  const isSafe = safeFoodKeys(context.constraints);
  const candidates = [...priced.items]
    .filter((item) => item.priced && !item.pantry)
    .sort((a, b) => b.totalPrice - a.totalPrice)
    .map((item) => getFood(item.foodKey))
    .filter((food) => food?.cheaperSwap && isSafe([food.cheaperSwap]).length === 1);

  if (candidates.length === 0) return null;

  const target = candidates[0];
  const replacement = getFood(target.cheaperSwap);
  let changed = 0;

  const next = meals.map((meal) => ({
    ...meal,
    ingredients: meal.ingredients.map((ingredient) => {
      if (matchFood(ingredient.name)?.key !== target.key) return ingredient;
      changed += 1;
      return { ...ingredient, name: replacement.name };
    }),
  }));

  if (changed === 0) return null;
  return {
    meals: next,
    detail: `${target.name} → ${replacement.name}`,
  };
}

/** Steps 3, 4 and 6: replace a whole meal, for different reasons. */
function replaceOneMeal(meals, priced, context, reason) {
  const pool = replacementPool(meals, context);
  if (pool.length === 0) return null;

  const mealCosts = costByMeal(priced.items, meals);
  const basket = new Set();
  for (const meal of meals) for (const key of foodKeysOf(meal)) basket.add(key);

  let victim;
  if (reason === 'replace-meal') {
    // The single most expensive dinner.
    victim = [...meals].sort((a, b) => (mealCosts.get(b.id) ?? 0) - (mealCosts.get(a.id) ?? 0))[0];
  } else if (reason === 'increase-overlap') {
    // The one sharing least with the rest of the week.
    victim = [...meals].sort((a, b) => sharedCount(a, meals) - sharedCount(b, meals))[0];
  } else {
    // reduce-variety: the meal whose protein nothing else uses.
    const proteins = meals.map(proteinOf);
    victim =
      meals.find(
        (meal, index) =>
          proteins[index] && proteins.filter((p) => p === proteins[index]).length === 1
      ) ?? meals[0];
  }

  if (!victim) return null;

  const others = meals.filter((meal) => meal.id !== victim.id);
  const otherKeys = new Set(others.flatMap((meal) => [...foodKeysOf(meal)]));

  const best = pool
    .map((recipe) => {
      const keys = foodKeysOf(recipe);
      const overlap = [...keys].filter((key) => otherKeys.has(key)).length;
      const cheap = { low: 3, mid: 0, high: -4 }[recipe.costTier] ?? 0;
      return { recipe, score: overlap * 1.5 + cheap };
    })
    .sort((a, b) => b.score - a.score)[0];

  if (!best) return null;
  return {
    meals: replaceMeal(meals, victim.id, best.recipe),
    detail: `${victim.title} → ${best.recipe.title}`,
  };
}

const sharedCount = (meal, meals) => {
  const keys = foodKeysOf(meal);
  const others = meals.filter((other) => other.id !== meal.id);
  const otherKeys = new Set(others.flatMap((other) => [...foodKeysOf(other)]));
  return [...keys].filter((key) => otherKeys.has(key)).length;
};

/** Step 5: strip the garnishes. Only ever touches ingredients marked optional. */
function dropOptional(meals) {
  let removed = 0;
  const next = meals.map((meal) => ({
    ...meal,
    ingredients: meal.ingredients.filter((ingredient) => {
      if (!ingredient.optional) return true;
      removed += 1;
      return false;
    }),
  }));
  return removed === 0 ? null : { meals: next, count: removed };
}

/**
 * Walk the ladder until the basket fits, or the ladder runs out.
 *
 * Each rung is tried once. A rung that doesn't actually save money is rolled
 * back rather than kept — otherwise the "what we changed" list fills up with
 * changes that achieved nothing.
 */
function optimize(meals, context) {
  let current = meals;
  let priced = assemble(current, context);
  const target = internalTarget(context.budget);
  const adjustments = [];

  if (priced.totals.subtotal <= target) return { meals: current, priced, adjustments };

  for (const step of OPTIMIZATION_STEPS) {
    const before = priced.totals.subtotal;
    let attempt = null;

    if (step.id === 'economy-packs') {
      const economy = assemble(current, context, 'economy');
      if (economy.totals.subtotal < before) {
        const changed = economy.items.filter((item, index) => {
          const previous = priced.items[index];
          return item.product?.id && previous?.product?.id !== item.product.id;
        }).length;
        priced = economy;
        adjustments.push({ id: step.id, label: step.describe(changed), saved: round(before - economy.totals.subtotal) });
      }
    } else {
      if (step.id === 'cheaper-ingredients') attempt = swapExpensiveIngredients(current, priced, context);
      else if (step.id === 'drop-optional') attempt = dropOptional(current);
      else attempt = replaceOneMeal(current, priced, context, step.id);

      if (attempt) {
        const next = assemble(attempt.meals, context, priced.mode);
        if (next.totals.subtotal < before) {
          current = attempt.meals;
          priced = next;
          adjustments.push({
            id: step.id,
            label: step.describe(attempt.count ?? 1),
            detail: attempt.detail,
            saved: round(before - next.totals.subtotal),
          });
        }
      }
    }

    if (priced.totals.subtotal <= target) break;
  }

  return { meals: current, priced, adjustments };
}

const round = (n) => Math.round(n * 100) / 100;

// ------------------------------------------------------------------- output

/** Assemble the object every screen reads. */
function buildPlan({ meals, priced, adjustments, request, context, source, notices = [] }) {
  const mealCosts = costByMeal(priced.items, meals);
  const reuse = reuseSummary(priced.items);
  const safety = validatePlan(meals, priced.items, context.constraints);
  const status = budgetStatus(priced.totals.subtotal, request.budget);

  const mealsOut = meals.map((meal) => ({
    id: meal.id,
    recipeId: meal.recipeId ?? meal.id,
    day: meal.day,
    title: meal.title,
    description: meal.description,
    cuisine: meal.cuisine,
    tags: meal.tags ?? [],
    prepTimeMinutes: meal.prepTimeMinutes,
    cookTimeMinutes: meal.cookTimeMinutes,
    totalTimeMinutes: meal.totalTimeMinutes ?? meal.prepTimeMinutes + meal.cookTimeMinutes,
    difficulty: meal.difficulty ?? 'Easy',
    servings: meal.servings,
    baseServings: meal.baseServings,
    ingredients: meal.ingredients,
    instructions: meal.instructions,
    nutritionPerServing: meal.nutritionPerServing,
    allergens: mealAllergens(meal),
    estimatedCost: mealCosts.get(meal.id) ?? 0,
    // Which of this meal's ingredients also turn up elsewhere in the week.
    sharedIngredients: reuse.shared
      .filter((entry) => entry.mealIds.includes(meal.id))
      .map((entry) => ({
        name: entry.name,
        withMeals: entry.mealTitles.filter((title) => title !== meal.title),
      })),
  }));

  const nutrition = averageNutrition(mealsOut);

  return {
    id: request.planId ?? `plan-${Date.now().toString(36)}`,
    version: PLAN_VERSION,
    createdAt: new Date().toISOString(),
    source,
    request,
    store: context.store,
    catalog: context.catalog.meta(),
    title: request.title ?? defaultTitle(request, mealsOut),
    meals: mealsOut,
    groceryItems: priced.items,
    categories: byCategory(priced.items, CATEGORIES),
    totals: priced.totals,
    budget: status,
    adjustments,
    unmatched: priced.unmatched,
    reuse: { shared: reuse.shared, singleUseCount: reuse.singleUseCount },
    nutrition,
    safety,
    notices: [
      ...notices,
      ...(status.withinBudget
        ? []
        : [
            {
              level: 'warning',
              text:
                `We got as close as we could, but this plan is $${status.overBudgetBy.toFixed(2)} over ` +
                'your budget. Raising the budget slightly, dropping a dinner, or allowing more ' +
                'budget-friendly ingredients would close the gap.',
            },
          ]),
      ...(priced.totals.fullyPriced
        ? []
        : [
            {
              level: 'warning',
              text:
                `${priced.totals.unpricedCount} item${priced.totals.unpricedCount === 1 ? '' : 's'} ` +
                "couldn't be priced at this store, so the total below is incomplete.",
            },
          ]),
    ],
  };
}

function averageNutrition(meals) {
  const withData = meals.filter((meal) => meal.nutritionPerServing?.calories);
  if (withData.length === 0) return null;
  const sum = (key) =>
    Math.round(
      withData.reduce((total, meal) => total + (meal.nutritionPerServing[key] ?? 0), 0) / withData.length
    );
  return {
    caloriesPerServing: sum('calories'),
    proteinGrams: sum('proteinGrams'),
    carbGrams: sum('carbGrams'),
    fatGrams: sum('fatGrams'),
    approximate: true,
  };
}

function defaultTitle(request, meals) {
  const style = { 'high-protein': 'High-Protein', vegetarian: 'Vegetarian', 'lower-calorie': 'Lighter', quick: 'Quick', 'budget-first': 'Budget' }[
    request.nutritionStyle
  ];
  return `${meals.length} ${style ? `${style} ` : ''}Dinners Under $${Math.round(request.budget)}`;
}

// ----------------------------------------------------------------- entry points

/** Shared setup: constraints, store, catalog, pantry. */
export function createContext(request) {
  const store = request.store ?? null;
  return {
    store,
    catalog: request.catalog ?? catalogFor(store),
    constraints: toConstraints(request),
    pantryKeys: request.pantryKeys ?? [],
    budget: request.budget,
  };
}

/**
 * Generate a plan from the built-in recipe bank.
 *
 * This is the no-API-key path, and it is a first-class one: everything after
 * meal selection is identical, so the pricing, grocery list and swapping are
 * exercised exactly as they are for an AI plan.
 */
export function generateFromBank(request) {
  const context = createContext(request);
  const feasible = assessBudget({
    budget: request.budget,
    people: request.people,
    meals: request.mealCount,
    leftovers: request.leftovers,
    priceIndex: context.store?.priceIndex ?? 1,
  });

  if (feasible.level === 'impossible' || feasible.level === 'invalid') {
    return { ok: false, error: 'budget-too-low', assessment: feasible };
  }

  const chosen = composeMeals(request.mealCount, context.constraints, {
    seed: request.seed ?? request.planId ?? 'plan',
    preferCheap: request.nutritionStyle === 'budget-first' || feasible.level === 'tight',
    pantryKeys: context.pantryKeys,
  });

  if (chosen.length < request.mealCount) {
    return {
      ok: false,
      error: 'too-restrictive',
      detail:
        `We could only find ${chosen.length} dinner${chosen.length === 1 ? '' : 's'} that meet all of ` +
        'your restrictions. Try relaxing the cooking-time limit or removing a dislike.',
    };
  }

  const meals = toPlanMeals(chosen, {
    servingsPerMeal: servingsFor({ people: request.people, leftovers: request.leftovers }),
  });

  const { meals: finalMeals, priced, adjustments } = optimize(meals, context);
  return {
    ok: true,
    plan: buildPlan({ meals: finalMeals, priced, adjustments, request, context, source: 'bank' }),
  };
}

/**
 * Turn validated model output into a priced plan.
 *
 * Meals the safety check rejects are dropped and replaced from the bank, so a
 * model that slips a dairy ingredient into a dairy-free plan costs the user a
 * different dinner, not a hospital visit.
 */
export function generateFromMeals(rawMeals, request) {
  const context = createContext(request);
  const servings = servingsFor({ people: request.people, leftovers: request.leftovers });
  const notices = [];

  const safe = rawMeals.filter((meal) => mealIsAcceptable(meal, context.constraints));
  const rejected = rawMeals.length - safe.length;
  if (rejected > 0) {
    notices.push({
      level: 'info',
      text: `${rejected} suggested meal${rejected === 1 ? '' : 's'} didn't pass our allergy and diet check, so we replaced ${rejected === 1 ? 'it' : 'them'}.`,
    });
  }

  let chosen = safe.slice(0, request.mealCount);
  if (chosen.length < request.mealCount) {
    const filler = composeMeals(request.mealCount - chosen.length, context.constraints, {
      seed: request.seed ?? 'filler',
      exclude: chosen.map((meal) => meal.id),
      pantryKeys: context.pantryKeys,
    });
    chosen = [...chosen, ...filler];
  }

  if (chosen.length === 0) return { ok: false, error: 'no-meals' };

  const meals = toPlanMeals(chosen, { servingsPerMeal: servings });
  const { meals: finalMeals, priced, adjustments } = optimize(meals, context);

  return {
    ok: true,
    plan: buildPlan({
      meals: finalMeals,
      priced,
      adjustments,
      request,
      context,
      source: rejected === rawMeals.length ? 'bank' : 'ai',
      notices,
    }),
  };
}

// --------------------------------------------------------------- swapping

/** Three replacements for one meal, each already priced against the plan. */
export function swapOptions(plan, mealId, { limit = 3 } = {}) {
  const context = createContext({ ...plan.request, store: plan.store });
  const options = alternativesFor(plan, mealId, context.constraints, { limit });

  return options.map((recipe) => {
    const meals = replaceMeal(plan.meals, mealId, recipe);
    const priced = assemble(meals, context);
    const status = budgetStatus(priced.totals.subtotal, plan.request.budget);
    return {
      recipe,
      newTotal: priced.totals.subtotal,
      delta: round(priced.totals.subtotal - plan.totals.subtotal),
      withinBudget: status.withinBudget,
      sharedWithPlan: [...foodKeysOf(recipe)].filter((key) =>
        plan.meals.some((meal) => meal.id !== mealId && foodKeysOf(meal).has(key))
      ).length,
    };
  });
}

/**
 * Apply a swap.
 *
 * Everything downstream is recomputed rather than patched — quantities,
 * product matches, the basket, the reuse summary. A swap that would push the
 * plan over budget is refused unless the caller passes `force`, which is what
 * the "yes, spend more" button sends.
 */
export function applySwap(plan, mealId, recipeId, { force = false } = {}) {
  const recipe = RECIPE_BY_ID.get(recipeId);
  if (!recipe) return { ok: false, error: 'unknown-recipe' };

  const context = createContext({ ...plan.request, store: plan.store });
  const meals = replaceMeal(plan.meals, mealId, recipe);
  const priced = assemble(meals, context);
  const status = budgetStatus(priced.totals.subtotal, plan.request.budget);

  if (!status.withinBudget && !force) {
    return {
      ok: false,
      error: 'over-budget',
      wouldBe: priced.totals.subtotal,
      over: status.overBudgetBy,
    };
  }

  return {
    ok: true,
    plan: buildPlan({
      meals,
      priced,
      adjustments: plan.adjustments,
      request: { ...plan.request, planId: plan.id },
      context,
      source: plan.source,
      notices: [],
    }),
  };
}

/** Re-total after someone ticks or unticks "I already have this". */
export function setPantryItem(plan, itemId, owned) {
  const groceryItems = plan.groceryItems.map((item) =>
    item.id === itemId ? { ...item, pantry: owned } : item
  );
  const totals = basketTotals(groceryItems);
  return {
    ...plan,
    groceryItems,
    categories: byCategory(groceryItems, CATEGORIES),
    totals,
    budget: budgetStatus(totals.subtotal, plan.request.budget),
  };
}

/** Tick a product off while shopping. Purely UI state, kept with the plan. */
export function setChecked(plan, itemId, checked) {
  const groceryItems = plan.groceryItems.map((item) =>
    item.id === itemId ? { ...item, checked } : item
  );
  return { ...plan, groceryItems, categories: byCategory(groceryItems, CATEGORIES) };
}

export { DAYS, assemble as priceMeals };
