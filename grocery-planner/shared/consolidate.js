// One line per food, across the whole week.
//
// Three recipes asking for "1 onion", "½ onion" and "1 medium yellow onion"
// have to become a single "yellow onions — about 2 needed" before anything is
// priced, or the basket buys three separate bags. Consolidation happens on the
// normalised pack-kind amount, so counts, cups and pounds of the same food all
// land in the same bucket.

import { fromCanonical } from './units.js';
import { normalizeIngredient } from './normalize.js';
import { getFood } from './foods.js';

/** Scale a recipe's ingredient quantities from its own servings to the plan's. */
export function scaleIngredients(ingredients, factor) {
  if (factor === 1) return ingredients;
  return ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: Number(ingredient.quantity ?? 0) * factor,
  }));
}

/**
 * Roll every meal's ingredients up into one requirement per food.
 *
 * Each requirement remembers which meals wanted it, which is what lets the
 * grocery list link an item back to its recipes and what lets a meal swap
 * subtract exactly the right amount again.
 */
export function consolidate(meals) {
  const requirements = new Map();
  const unmatched = [];

  for (const meal of meals) {
    const factor = meal.servings && meal.baseServings ? meal.servings / meal.baseServings : 1;
    for (const raw of scaleIngredients(meal.ingredients ?? [], factor)) {
      const ingredient = normalizeIngredient(raw);

      if (!ingredient.matched || !ingredient.packAmount) {
        unmatched.push({
          raw: ingredient.raw,
          mealId: meal.id,
          mealTitle: meal.title,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          // Distinguishes "we don't stock this" from "we couldn't measure it".
          reason: ingredient.matched ? 'unmeasurable' : 'unknown-food',
        });
        continue;
      }

      const existing = requirements.get(ingredient.key);
      const usage = {
        mealId: meal.id,
        mealTitle: meal.title,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        optional: ingredient.optional,
      };

      if (existing) {
        existing.amount += ingredient.packAmount.amount;
        existing.approximate = existing.approximate || ingredient.packAmount.approximate;
        existing.meals.push(usage);
        existing.optionalOnly = existing.optionalOnly && ingredient.optional;
      } else {
        requirements.set(ingredient.key, {
          key: ingredient.key,
          displayName: ingredient.displayName,
          category: ingredient.category,
          allergens: ingredient.allergens,
          amount: ingredient.packAmount.amount,
          kind: ingredient.packAmount.kind,
          approximate: ingredient.packAmount.approximate,
          meals: [usage],
          optionalOnly: ingredient.optional,
        });
      }
    }
  }

  return {
    requirements: [...requirements.values()].map(describe),
    unmatched,
  };
}

/** Adds the human-readable "how much do I need" string. */
function describe(requirement) {
  const food = getFood(requirement.key);
  const amount = fromCanonical(requirement.amount, requirement.kind);
  return {
    ...requirement,
    // Counts read better with the noun attached: "about 2 needed".
    needText:
      requirement.kind === 'count'
        ? `about ${amount} needed`
        : `${amount} needed`,
    isProtein: Boolean(food?.isProtein),
  };
}

/**
 * Requirements grouped into the grocery list's departments, in aisle order.
 *
 * Takes either consolidated requirements (which carry `displayName`) or priced
 * grocery items (which carry `name`), because the same grouping is used for
 * both.
 */
export function byCategory(items, categoryOrder) {
  const label = (item) => item.name ?? item.displayName ?? '';
  const groups = new Map(categoryOrder.map((name) => [name, []]));
  for (const item of items) {
    const bucket = groups.get(item.category) ?? groups.get('Other');
    bucket.push(item);
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length > 0)
    .map(([category, list]) => ({
      category,
      items: [...list].sort((a, b) => label(a).localeCompare(label(b))),
    }));
}
