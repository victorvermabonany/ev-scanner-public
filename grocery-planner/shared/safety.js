// Allergies are not a preference, and they are not a prompt instruction.
//
// The model is told about them, but nothing it returns is trusted: every meal
// is re-checked here, against the allergen tags in foods.js, before it can
// reach a screen. A meal that fails is removed — never "adjusted" — and the
// planner asks for a replacement.
//
// Dislikes are the softer case: strong preferences that block a meal by
// default and can only be overridden by the user saying so explicitly.

import { getFood } from './foods.js';
import { matchFood, normalizeIngredient } from './normalize.js';

/** The diet switches the questionnaire offers, mapped to foods.js flags. */
export const DIETS = [
  { id: 'vegetarian', label: 'Vegetarian', flag: 'vegetarian' },
  { id: 'vegan', label: 'Vegan', flag: 'vegan' },
  { id: 'gluten-free', label: 'Gluten-free', flag: 'glutenFree' },
  { id: 'dairy-free', label: 'Dairy-free', flag: 'dairyFree' },
];

const DIET_BY_ID = new Map(DIETS.map((diet) => [diet.id, diet]));

/** Free-text dislikes ("mushrooms, seafood") resolved to food keys where possible. */
export function parseDislikes(input) {
  const parts = Array.isArray(input)
    ? input
    : String(input ?? '')
        .split(/[,\n;]/)
        .map((part) => part.trim())
        .filter(Boolean);

  return parts.map((text) => {
    const food = matchFood(text);
    return {
      text,
      key: food?.key ?? null,
      // Category-level dislikes people actually type. "No seafood" has to
      // block salmon and shrimp, not just an ingredient literally called that.
      category: /seafood|fish/i.test(text) ? 'Meat and seafood' : null,
      seafood: /seafood|fish|shellfish/i.test(text),
    };
  });
}

/** Every allergen a meal carries, from its matched ingredients. */
export function mealAllergens(meal) {
  const tags = new Set();
  for (const ingredient of meal.ingredients ?? []) {
    for (const allergen of normalizeIngredient(ingredient).allergens) tags.add(allergen);
  }
  return [...tags];
}

const SEAFOOD_KEYS = new Set(['salmon', 'tilapia', 'shrimp', 'canned_tuna']);

/**
 * Why this meal can't be served to this household.
 *
 * Returns every violation rather than the first, so the UI can explain the
 * whole problem and the planner can prefer replacements that fix all of it.
 */
export function mealViolations(meal, constraints = {}) {
  const allergies = new Set(constraints.allergies ?? []);
  const diets = constraints.diets ?? [];
  const dislikes = constraints.dislikes ?? [];
  const overrides = new Set(constraints.dislikeOverrides ?? []);
  const problems = [];

  for (const raw of meal.ingredients ?? []) {
    const ingredient = normalizeIngredient(raw);

    // Unknown foods can't be cleared. When the household has allergies at all,
    // an unidentifiable ingredient is a blocker, not a shrug.
    if (!ingredient.matched) {
      if (allergies.size > 0) {
        problems.push({
          type: 'unknown-ingredient',
          ingredient: ingredient.raw,
          detail: `"${ingredient.raw}" could not be identified, so its allergens are unknown.`,
          severity: 'block',
        });
      }
      continue;
    }

    for (const allergen of ingredient.allergens) {
      if (allergies.has(allergen)) {
        problems.push({
          type: 'allergy',
          ingredient: ingredient.displayName,
          allergen,
          detail: `${ingredient.displayName} contains ${allergen}.`,
          severity: 'block',
        });
      }
    }

    for (const dietId of diets) {
      const diet = DIET_BY_ID.get(dietId);
      if (diet && ingredient.diet && ingredient.diet[diet.flag] === false) {
        problems.push({
          type: 'diet',
          ingredient: ingredient.displayName,
          diet: dietId,
          detail: `${ingredient.displayName} is not ${diet.label.toLowerCase()}.`,
          severity: 'block',
        });
      }
    }

    for (const dislike of dislikes) {
      if (overrides.has(dislike.text)) continue;
      const hit =
        (dislike.key && dislike.key === ingredient.key) ||
        (dislike.seafood && SEAFOOD_KEYS.has(ingredient.key)) ||
        (!dislike.key && ingredient.displayName.toLowerCase().includes(dislike.text.toLowerCase()));
      if (hit) {
        problems.push({
          type: 'dislike',
          ingredient: ingredient.displayName,
          dislike: dislike.text,
          detail: `${ingredient.displayName} is on your "don't like" list.`,
          // Soft: blocks the meal, but the user can waive it.
          severity: 'prefer',
        });
      }
    }
  }

  return problems;
}

/** True when nothing in the meal blocks it for this household. */
export const mealIsSafe = (meal, constraints) =>
  mealViolations(meal, constraints).every((problem) => problem.severity !== 'block');

/** A meal that is both safe and free of un-waived dislikes. */
export const mealIsAcceptable = (meal, constraints) =>
  mealViolations(meal, constraints).length === 0;

/**
 * Final gate before a plan is displayed.
 *
 * Runs after pricing too, because product matching can introduce an allergen
 * the recipe didn't have — a "cheese" line matched to a dairy product, say.
 */
export function validatePlan(meals, groceryItems, constraints = {}) {
  const allergies = new Set(constraints.allergies ?? []);
  const blocked = [];
  const flagged = [];

  for (const meal of meals) {
    const problems = mealViolations(meal, constraints);
    if (problems.some((problem) => problem.severity === 'block')) {
      blocked.push({ mealId: meal.id, title: meal.title, problems });
    }
  }

  for (const item of groceryItems ?? []) {
    const product = item.product;
    if (!product) continue;

    // A provider that can't tell us the allergens gets flagged, not cleared.
    if (product.allergens == null) {
      flagged.push({
        item: item.name,
        reason: 'no-allergen-data',
        detail: `${product.name} has no allergen data from the store. Check the label.`,
      });
      continue;
    }
    for (const allergen of product.allergens) {
      if (allergies.has(allergen)) {
        flagged.push({
          item: item.name,
          reason: 'allergen-in-product',
          allergen,
          detail: `${product.name} is labelled as containing ${allergen}.`,
        });
      }
    }
  }

  return {
    ok: blocked.length === 0 && flagged.length === 0,
    blocked,
    flagged,
    // Never presented as a guarantee — see the label-check reminder in the UI.
    checkedAllergens: [...allergies],
  };
}

/** Foods safe for this household, used when the planner needs a substitute. */
export function safeFoodKeys(constraints = {}) {
  const allergies = new Set(constraints.allergies ?? []);
  const diets = constraints.diets ?? [];
  const dislikes = constraints.dislikes ?? [];

  return (keys) =>
    keys.filter((key) => {
      const food = getFood(key);
      if (!food) return false;
      if (food.allergens.some((allergen) => allergies.has(allergen))) return false;
      for (const dietId of diets) {
        const diet = DIET_BY_ID.get(dietId);
        if (diet && food.diet[diet.flag] === false) return false;
      }
      return !dislikes.some(
        (dislike) =>
          dislike.key === key || (dislike.seafood && SEAFOOD_KEYS.has(key))
      );
    });
}
