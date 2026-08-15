// Nothing the model returns is trusted until it comes through here.
//
// Two separate jobs, and the second one matters more than it looks:
//
//   1. Shape. Missing fields, wrong types, strings where numbers belong —
//      rejected, with a reason, so the planner can retry or fall back rather
//      than render half a recipe.
//   2. Authority. Prices, totals, availability and "this is allergy safe"
//      claims are STRIPPED, whether or not the model was asked for them. Those
//      belong to the catalog and to safety.js. A model that decides a bag of
//      rice costs $2 must not be able to put that number in front of a user.

const PRICE_KEYS = new Set([
  'price', 'cost', 'total', 'total_price', 'totalPrice', 'estimated_cost',
  'estimatedCost', 'estimated_total', 'estimatedTotal', 'subtotal', 'unit_price',
  'unitPrice', 'package_price', 'packagePrice', 'budget', 'basket_total',
  'basketTotal', 'store_price', 'storePrice', 'availability', 'available',
  'in_stock', 'inStock', 'product_id', 'productId', 'allergy_safe', 'allergySafe',
  'allergen_free', 'allergenFree',
]);

/** Recursively drop any key the model isn't allowed to have an opinion on. */
export function stripAuthorityFields(value) {
  if (Array.isArray(value)) return value.map(stripAuthorityFields);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, inner] of Object.entries(value)) {
      if (PRICE_KEYS.has(key)) continue;
      out[key] = stripAuthorityFields(inner);
    }
    return out;
  }
  return value;
}

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const asNumber = (value) => {
  const n = typeof value === 'string' ? Number(value.replace(/[^0-9.]/g, '')) : Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Validate one meal from a model response.
 *
 * Returns `{ ok, meal, errors }`. Ingredient quantities are coerced rather
 * than rejected — "1/2" and "0.5" both happen — but a meal with no usable
 * ingredients or no instructions is thrown out.
 */
export function validateMeal(raw, index = 0) {
  const errors = [];
  const data = stripAuthorityFields(raw ?? {});

  if (!isNonEmptyString(data.title)) errors.push(`meal ${index}: missing title`);

  const ingredients = Array.isArray(data.ingredients) ? data.ingredients : [];
  const cleanIngredients = ingredients
    .map((ingredient) => {
      if (!isNonEmptyString(ingredient?.name)) return null;
      // fraction() first: "1/2" survives it, but asNumber() alone would strip
      // the slash and read it as 12.
      const quantity = asNumber(fraction(ingredient.quantity));
      return {
        name: ingredient.name.trim(),
        quantity: quantity ?? 1,
        unit: isNonEmptyString(ingredient.unit) ? ingredient.unit.trim() : 'each',
        optional: Boolean(ingredient.optional),
      };
    })
    .filter(Boolean);

  if (cleanIngredients.length === 0) errors.push(`meal ${index}: no usable ingredients`);

  const instructions = (Array.isArray(data.instructions) ? data.instructions : [])
    .filter(isNonEmptyString)
    .map((step) => step.trim());

  if (instructions.length === 0) errors.push(`meal ${index}: no instructions`);

  const prep = asNumber(data.prep_time_minutes ?? data.prepTimeMinutes) ?? 10;
  const cook = asNumber(data.cook_time_minutes ?? data.cookTimeMinutes) ?? 20;
  const nutrition = data.nutrition_per_serving ?? data.nutritionPerServing ?? {};

  if (errors.length > 0) return { ok: false, errors, meal: null };

  return {
    ok: true,
    errors: [],
    meal: {
      id: slug(data.title) || `meal-${index}`,
      title: data.title.trim(),
      description: isNonEmptyString(data.description) ? data.description.trim() : '',
      cuisine: isNonEmptyString(data.cuisine) ? data.cuisine.trim() : 'American',
      tags: Array.isArray(data.dietary_tags ?? data.tags)
        ? (data.dietary_tags ?? data.tags).filter(isNonEmptyString)
        : [],
      prepTimeMinutes: prep,
      cookTimeMinutes: cook,
      totalTimeMinutes: prep + cook,
      difficulty: isNonEmptyString(data.difficulty) ? data.difficulty : 'Easy',
      baseServings: asNumber(data.servings) || 2,
      ingredients: cleanIngredients,
      instructions,
      nutritionPerServing: {
        calories: asNumber(nutrition.calories) ?? null,
        proteinGrams: asNumber(nutrition.protein_grams ?? nutrition.proteinGrams) ?? null,
        carbGrams: asNumber(nutrition.carb_grams ?? nutrition.carbGrams) ?? null,
        fatGrams: asNumber(nutrition.fat_grams ?? nutrition.fatGrams) ?? null,
      },
      costTier: 'mid',
      source: 'ai',
    },
  };
}

/** "1/2" and "1 1/2" turn up often enough to be worth handling. */
function fraction(value) {
  if (typeof value !== 'string') return value;
  const match = value.trim().match(/^(\d+)?\s*(\d+)\/(\d+)$/);
  if (!match) return value;
  const [, whole, numerator, denominator] = match;
  return (Number(whole ?? 0) + Number(numerator) / Number(denominator)).toString();
}

const slug = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

/**
 * Validate a whole plan response.
 *
 * Partial success is deliberate: four good meals out of five is worth keeping,
 * and the planner tops the week up from the bank rather than failing outright.
 */
export function validatePlanResponse(raw, { expectedMeals } = {}) {
  const errors = [];
  const data = stripAuthorityFields(raw ?? {});
  const rawMeals = Array.isArray(data.meals) ? data.meals : [];

  if (rawMeals.length === 0) {
    return { ok: false, meals: [], errors: ['response contained no meals'], title: null };
  }

  const meals = [];
  rawMeals.forEach((meal, index) => {
    const result = validateMeal(meal, index);
    if (result.ok) meals.push(result.meal);
    else errors.push(...result.errors);
  });

  // De-duplicate: a model asked for five dinners occasionally returns four
  // and a repeat.
  const seen = new Set();
  const unique = meals.filter((meal) => {
    const key = meal.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    ok: unique.length > 0,
    meals: unique,
    title: isNonEmptyString(data.plan_title) ? data.plan_title.trim() : null,
    errors,
    shortBy: expectedMeals ? Math.max(0, expectedMeals - unique.length) : 0,
  };
}
