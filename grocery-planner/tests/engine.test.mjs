// The tests PRD §26 asks for, plus the ones that keep the data table honest.
//
// Everything here runs against the real modules with no mocks: the planner is
// a pure function of its inputs, so an end-to-end plan is as cheap to test as
// a unit.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { toCanonical, fromCanonical, unitKind } from '../shared/units.js';
import { FOODS, getFood, ALLERGENS } from '../shared/foods.js';
import { matchFood, normalizeIngredient } from '../shared/normalize.js';
import { consolidate } from '../shared/consolidate.js';
import { RECIPES } from '../shared/recipes.js';
import { findStores, getStore } from '../shared/stores.js';
import { catalogFor } from '../shared/catalog.js';
import { packagesFor, priceBasket, basketTotals } from '../shared/pricing.js';
import { internalTarget, assessBudget, budgetStatus, BUDGET_BUFFER } from '../shared/budget.js';
import { mealViolations, mealIsAcceptable, parseDislikes, validatePlan } from '../shared/safety.js';
import { validatePlanResponse, stripAuthorityFields } from '../shared/schema.js';
import { buildPrompt, buildRequest, planSchema, readPlanResponse } from '../shared/ai.js';
import {
  generateFromBank,
  generateFromMeals,
  swapOptions,
  applySwap,
  setPantryItem,
} from '../shared/planner.js';

const STORE = getStore('chi-northside-market');

const baseRequest = (overrides = {}) => ({
  planId: 'test-plan',
  seed: 'test',
  zip: '60657',
  store: STORE,
  budget: 120,
  people: 2,
  mealCount: 5,
  leftovers: 'none',
  nutritionStyle: 'balanced',
  maxCookMinutes: 60,
  diets: [],
  allergies: [],
  dislikes: [],
  cuisines: [],
  pantryKeys: [],
  ...overrides,
});

// ------------------------------------------------------------------- units

describe('units', () => {
  test('converts weight and volume to canonical units', () => {
    assert.equal(Math.round(toCanonical(1, 'lb').amount), 454);
    assert.equal(Math.round(toCanonical(2, 'cups').amount), 473);
    assert.equal(toCanonical(3, 'each').amount, 3);
    assert.equal(toCanonical(1, 'dozen').amount, 12);
  });

  test('treats recipe count words as counts', () => {
    for (const unit of ['can', 'cloves', 'bunch', 'slices', '']) {
      assert.equal(unitKind(unit), 'count', `${unit} should be a count`);
    }
  });

  test('formats amounts the way a shopper would read them', () => {
    assert.equal(fromCanonical(907, 'weight'), '2 lb');
    assert.equal(fromCanonical(240, 'volume'), '1 cup');
  });

  test('refuses units it does not know', () => {
    assert.equal(toCanonical(1, 'smidgen'), null);
  });
});

// ------------------------------------------------------------------- foods

describe('food table', () => {
  test('every recipe ingredient resolves to a known food', () => {
    const misses = [];
    for (const recipe of RECIPES) {
      for (const ingredient of recipe.ingredients) {
        if (!matchFood(ingredient.name)) misses.push(`${recipe.id}: ${ingredient.name}`);
      }
    }
    assert.deepEqual(misses, [], 'unmatched ingredients would become unpriced basket lines');
  });

  test('every recipe ingredient can be measured against a package', () => {
    const misses = [];
    for (const recipe of RECIPES) {
      for (const ingredient of recipe.ingredients) {
        const normalized = normalizeIngredient(ingredient);
        if (!normalized.packAmount) misses.push(`${recipe.id}: ${ingredient.name} (${ingredient.unit})`);
      }
    }
    assert.deepEqual(misses, []);
  });

  test('diet flags are derived from allergens, never contradicted', () => {
    for (const food of FOODS) {
      if (food.allergens.includes('wheat')) assert.equal(food.diet.glutenFree, false, food.key);
      if (food.allergens.includes('milk')) assert.equal(food.diet.dairyFree, false, food.key);
      if (food.diet.vegan) assert.equal(food.diet.vegetarian, true, food.key);
    }
  });

  test('allergen tags only use the questionnaire vocabulary', () => {
    for (const food of FOODS) {
      for (const allergen of food.allergens) {
        assert.ok(ALLERGENS.includes(allergen), `${food.key} has unknown allergen ${allergen}`);
      }
    }
  });

  test('every food has at least one purchasable package', () => {
    for (const food of FOODS) assert.ok(food.packs.length > 0, food.key);
  });
});

// ----------------------------------------------------------- normalisation

describe('ingredient matching', () => {
  test('picks the most specific food, not the first substring', () => {
    assert.equal(matchFood('green onions').key, 'green_onion');
    assert.equal(matchFood('1 medium yellow onion, diced').key, 'yellow_onion');
    assert.equal(matchFood('heavy cream').key, 'heavy_cream');
    assert.equal(matchFood('sour cream').key, 'sour_cream');
  });

  test('returns null rather than guessing', () => {
    assert.equal(matchFood('dragonfruit compote'), null);
    assert.equal(normalizeIngredient({ name: 'dragonfruit compote', quantity: 1 }).matched, false);
  });
});

// ------------------------------------------------------------ consolidation

describe('consolidation', () => {
  test('combines the same food written three different ways (PRD §11)', () => {
    const { requirements } = consolidate([
      { id: 'a', title: 'A', servings: 2, baseServings: 2, ingredients: [{ name: 'onion', quantity: 1, unit: 'each' }] },
      { id: 'b', title: 'B', servings: 2, baseServings: 2, ingredients: [{ name: 'onions', quantity: 0.5, unit: 'each' }] },
      { id: 'c', title: 'C', servings: 2, baseServings: 2, ingredients: [{ name: '1 medium yellow onion', quantity: 1, unit: 'each' }] },
    ]);

    const onion = requirements.filter((item) => item.key === 'yellow_onion');
    assert.equal(onion.length, 1, 'three mentions must become one line');
    assert.equal(onion[0].kind, 'count', 'onions belong on the list as onions');
    assert.equal(onion[0].amount, 2.5);
    assert.equal(onion[0].meals.length, 3);
    assert.equal(onion[0].needText, 'about 2.5 needed');
  });

  test('scales quantities to the household size', () => {
    const { requirements } = consolidate([
      { id: 'a', title: 'A', servings: 4, baseServings: 2, ingredients: [{ name: 'white rice', quantity: 1, unit: 'cup' }] },
    ]);
    // 1 cup of rice for two, so 2 cups for four: ~370 g.
    assert.ok(Math.abs(requirements[0].amount - 370) < 5, `got ${requirements[0].amount}`);
  });

  test('keeps unmatched ingredients visible instead of dropping them', () => {
    const { requirements, unmatched } = consolidate([
      { id: 'a', title: 'A', servings: 2, baseServings: 2, ingredients: [{ name: 'unobtainium flakes', quantity: 1, unit: 'tsp' }] },
    ]);
    assert.equal(requirements.length, 0);
    assert.equal(unmatched.length, 1);
    assert.equal(unmatched[0].reason, 'unknown-food');
  });
});

// ----------------------------------------------------------------- pricing

describe('package pricing', () => {
  const catalog = catalogFor(STORE);

  test('charges for whole packages, not the portion used (PRD §12)', () => {
    const cheddar = catalog.search('cheddar').find((product) => product.brand.includes('Store brand'));
    // Half a bag needed.
    const packs = packagesFor(cheddar, cheddar.packageAmount / 2);
    assert.equal(packs.count, 1);
    assert.equal(packs.total, cheddar.price, 'half a package still costs a whole package');
  });

  test('rounds up to the next package', () => {
    const rice = catalog.search('white_rice')[0];
    const packs = packagesFor(rice, rice.packageAmount * 1.2);
    assert.equal(packs.count, 2);
    assert.equal(packs.total, Math.round(rice.price * 2 * 100) / 100);
  });

  test('prices a basket and totals it in code', () => {
    const { requirements } = consolidate([
      {
        id: 'a', title: 'A', servings: 2, baseServings: 2,
        ingredients: [
          { name: 'shredded cheddar', quantity: 0.5, unit: 'cup' },
          { name: 'white rice', quantity: 1, unit: 'cup' },
        ],
      },
    ]);
    const { items, totals } = priceBasket(requirements, catalog);
    const sum = items.reduce((total, item) => total + item.totalPrice, 0);
    assert.equal(totals.subtotal, Math.round(sum * 100) / 100);
    assert.equal(totals.fullyPriced, true);
  });

  test('pantry items leave the subtotal and become savings', () => {
    const { requirements } = consolidate([
      {
        id: 'a', title: 'A', servings: 2, baseServings: 2,
        ingredients: [
          { name: 'olive oil', quantity: 2, unit: 'tbsp' },
          { name: 'white rice', quantity: 1, unit: 'cup' },
        ],
      },
    ]);
    const full = priceBasket(requirements, catalog);
    const withPantry = priceBasket(requirements, catalog, { pantryKeys: ['olive_oil'] });

    assert.ok(withPantry.totals.subtotal < full.totals.subtotal);
    assert.ok(withPantry.totals.pantrySavings > 0);
    assert.equal(withPantry.items.length, full.items.length, 'the item stays on the list');
  });

  test('a store that does not carry a food yields an unpriced line, not a silent hole', () => {
    const valu = catalogFor(getStore('chi-valu-foods'));
    const { requirements } = consolidate([
      { id: 'a', title: 'A', servings: 2, baseServings: 2, ingredients: [{ name: 'quinoa', quantity: 1, unit: 'cup' }] },
    ]);
    const { items, totals } = priceBasket(requirements, valu);
    assert.equal(items[0].priced, false);
    assert.equal(totals.fullyPriced, false);
    assert.equal(totals.unpricedCount, 1);
  });
});

// ------------------------------------------------------------------ budget

describe('budget rules', () => {
  test('aims below the stated budget', () => {
    assert.equal(internalTarget(100), Math.round(100 * BUDGET_BUFFER * 100) / 100);
    assert.ok(internalTarget(100) < 100);
  });

  test('explains an impossible budget with a number and a way out (PRD §22)', () => {
    const verdict = assessBudget({ budget: 25, people: 4, meals: 5, priceIndex: 1 });
    assert.equal(verdict.level, 'impossible');
    assert.match(verdict.message, /\$25/);
    assert.match(verdict.message, /increasing the budget/);
    assert.ok(verdict.floor > 25);
  });

  test('lets a tight-but-possible budget through with a warning', () => {
    const verdict = assessBudget({ budget: 35, people: 2, meals: 5, priceIndex: 1 });
    assert.equal(verdict.level, 'tight');
    assert.ok(verdict.message);
  });

  test('reports remaining budget rather than only over/under', () => {
    const status = budgetStatus(92.4, 100);
    assert.equal(status.remaining, 7.6);
    assert.equal(status.withinBudget, true);
  });
});

// ------------------------------------------------------------------ safety

describe('allergies and diets', () => {
  const withMilk = {
    id: 'm', title: 'Cheesy thing',
    ingredients: [{ name: 'shredded cheddar', quantity: 1, unit: 'cup' }],
  };

  test('an allergen in any ingredient blocks the meal', () => {
    const problems = mealViolations(withMilk, { allergies: ['milk'] });
    assert.equal(problems.length, 1);
    assert.equal(problems[0].type, 'allergy');
    assert.equal(problems[0].severity, 'block');
    assert.equal(mealIsAcceptable(withMilk, { allergies: ['milk'] }), false);
  });

  test('diet violations block too', () => {
    const beef = { id: 'b', title: 'Beef', ingredients: [{ name: 'ground beef', quantity: 1, unit: 'lb' }] };
    assert.equal(mealIsAcceptable(beef, { diets: ['vegetarian'] }), false);
    assert.equal(mealIsAcceptable(beef, { diets: [] }), true);
  });

  test('an unidentifiable ingredient blocks when the household has allergies', () => {
    const mystery = { id: 'x', title: 'X', ingredients: [{ name: 'mystery paste', quantity: 1, unit: 'tbsp' }] };
    assert.equal(mealIsAcceptable(mystery, { allergies: ['peanuts'] }), false);
    assert.equal(mealIsAcceptable(mystery, { allergies: [] }), true);
  });

  test('"no seafood" covers salmon and shrimp, not just the word', () => {
    const dislikes = parseDislikes('seafood, mushrooms');
    const salmon = { id: 's', title: 'S', ingredients: [{ name: 'salmon fillets', quantity: 1, unit: 'lb' }] };
    assert.equal(mealIsAcceptable(salmon, { dislikes }), false);
    assert.equal(mealViolations(salmon, { dislikes })[0].severity, 'prefer');
  });

  test('flags a product whose allergen data is missing', () => {
    const result = validatePlan([], [{ name: 'Mystery', product: { name: 'Mystery', allergens: null } }], {});
    assert.equal(result.ok, false);
    assert.equal(result.flagged[0].reason, 'no-allergen-data');
  });
});

// ---------------------------------------------------------- model response

describe('model output validation', () => {
  test('strips anything price- or availability-shaped (PRD §26)', () => {
    const stripped = stripAuthorityFields({
      meals: [{ title: 'X', price: 4.99, estimated_cost: 12, ingredients: [{ name: 'rice', cost: 2 }] }],
      total: 80,
    });
    assert.equal('total' in stripped, false);
    assert.equal('price' in stripped.meals[0], false);
    assert.equal('estimated_cost' in stripped.meals[0], false);
    assert.equal('cost' in stripped.meals[0].ingredients[0], false);
  });

  test('rejects meals with no ingredients or no instructions', () => {
    const result = validatePlanResponse({
      meals: [
        { title: 'Empty', ingredients: [], instructions: ['Cook it.'] },
        { title: 'Fine', ingredients: [{ name: 'white rice', quantity: 1, unit: 'cup' }], instructions: ['Cook it.'] },
      ],
    });
    assert.equal(result.meals.length, 1);
    assert.equal(result.meals[0].title, 'Fine');
    assert.equal(result.errors.length, 1);
  });

  test('copes with fractions and missing units', () => {
    const result = validatePlanResponse({
      meals: [{ title: 'F', ingredients: [{ name: 'yellow onions', quantity: '1/2' }], instructions: ['Chop.'] }],
    });
    assert.equal(result.meals[0].ingredients[0].quantity, 0.5);
    assert.equal(result.meals[0].ingredients[0].unit, 'each');
  });

  test('drops duplicate meals', () => {
    const meal = { title: 'Same', ingredients: [{ name: 'white rice', quantity: 1, unit: 'cup' }], instructions: ['Cook.'] };
    const result = validatePlanResponse({ meals: [meal, { ...meal }] }, { expectedMeals: 2 });
    assert.equal(result.meals.length, 1);
    assert.equal(result.shortBy, 1);
  });
});

describe('AI request', () => {
  test('the prompt states allergies in absolute terms', () => {
    const prompt = buildPrompt({
      people: 2, mealCount: 5, servingsPerMeal: 2, nutritionStyle: 'balanced',
      maxCookMinutes: 30, allergies: ['peanuts'], dislikes: ['mushrooms'],
    });
    assert.match(prompt, /ALLERGIES/);
    assert.match(prompt, /peanuts/);
    assert.match(prompt, /Do not use: mushrooms/);
    assert.match(prompt, /Allowed ingredients/);
  });

  test('the schema asks for no prices', () => {
    const json = JSON.stringify(planSchema(5));
    for (const word of ['price', 'cost', 'budget', 'availability']) {
      assert.equal(json.includes(word), false, `schema should not mention ${word}`);
    }
  });

  test('builds a request with structured output and no invented model id', () => {
    const built = buildRequest(
      {
        people: 2, mealCount: 5, servingsPerMeal: 2, nutritionStyle: 'balanced',
        maxCookMinutes: 45, allergies: [], diets: [], dislikes: [], cuisines: [], pantry: [],
      },
      { model: 'claude-opus-5', effort: 'medium' }
    );

    assert.equal(built.model, 'claude-opus-5');
    assert.equal(built.output_config.format.type, 'json_schema');
    assert.equal(built.output_config.effort, 'medium');
    assert.equal(built.messages[0].role, 'user');
    assert.ok(built.max_tokens >= 8000, 'a week of recipes needs room');
    assert.match(built.system, /Allergies and dietary restrictions are absolute/);
    // Every object in the schema must be closed, or structured outputs rejects it.
    const closed = JSON.stringify(built.output_config.format.schema).match(/"type":"object"/g);
    const guards = JSON.stringify(built.output_config.format.schema).match(/"additionalProperties":false/g);
    assert.equal(closed.length, guards.length);
  });

  test('a refusal is reported as a refusal', () => {
    assert.throws(
      () => readPlanResponse({ stop_reason: 'refusal', stop_details: { explanation: 'nope' }, content: [] }),
      /declined/
    );
  });
});

// ------------------------------------------------------------------- stores

describe('stores', () => {
  test('rejects an invalid ZIP and an unsupported one differently (PRD §22)', () => {
    assert.equal(findStores('abc').reason, 'invalid-zip');
    assert.equal(findStores('99999').reason, 'unsupported-area');
    assert.ok(findStores('99999').supportedCities.length > 0);
  });

  test('returns supported stores for a covered ZIP', () => {
    const result = findStores('60657');
    assert.equal(result.ok, true);
    assert.ok(result.stores.length >= 3);
    assert.equal(result.area.city, 'Chicago');
  });
});

// -------------------------------------------------------------- end to end

describe('plan generation', () => {
  test('produces a complete, priced, in-budget plan', () => {
    const result = generateFromBank(baseRequest());
    assert.equal(result.ok, true);

    const plan = result.plan;
    assert.equal(plan.meals.length, 5);
    assert.equal(new Set(plan.meals.map((meal) => meal.title)).size, 5, 'no repeats');
    assert.ok(plan.groceryItems.length > 0);
    assert.equal(plan.totals.fullyPriced, true);
    assert.ok(plan.budget.withinBudget, `$${plan.totals.subtotal} vs $${plan.request.budget}`);
    assert.ok(plan.budget.remaining > 0);

    for (const meal of plan.meals) {
      assert.ok(meal.instructions.length >= 3, meal.title);
      assert.ok(meal.servings === 2);
      assert.ok(meal.totalTimeMinutes <= 60);
      assert.ok(typeof meal.estimatedCost === 'number');
    }
  });

  test('meal costs attribute the basket without inventing money', () => {
    const { plan } = generateFromBank(baseRequest());
    const attributed = plan.meals.reduce((total, meal) => total + meal.estimatedCost, 0);
    assert.ok(Math.abs(attributed - plan.totals.subtotal) < 0.05);
  });

  test('respects a cooking-time limit', () => {
    const { plan } = generateFromBank(baseRequest({ maxCookMinutes: 30, budget: 140 }));
    for (const meal of plan.meals) assert.ok(meal.totalTimeMinutes <= 30, meal.title);
  });

  test('never puts an allergen in an allergy plan', () => {
    for (const allergen of ['milk', 'wheat', 'fish', 'shellfish', 'peanuts', 'eggs']) {
      const { plan } = generateFromBank(baseRequest({ allergies: [allergen], budget: 160 }));
      for (const meal of plan.meals) {
        assert.equal(
          meal.allergens.includes(allergen),
          false,
          `${meal.title} contains ${allergen}`
        );
      }
      assert.equal(plan.safety.ok, true);
    }
  });

  test('honours vegetarian and vegan plans', () => {
    for (const diet of ['vegetarian', 'vegan']) {
      const { plan } = generateFromBank(baseRequest({ diets: [diet], mealCount: 4, budget: 140 }));
      for (const meal of plan.meals) {
        for (const ingredient of meal.ingredients) {
          const food = matchFood(ingredient.name);
          const flag = diet === 'vegan' ? food.diet.vegan : food.diet.vegetarian;
          assert.ok(flag, `${meal.title} uses ${food.name} on a ${diet} plan`);
        }
      }
    }
  });

  test('keeps disliked foods out', () => {
    const { plan } = generateFromBank(baseRequest({ dislikes: ['mushrooms', 'seafood'] }));
    for (const meal of plan.meals) {
      for (const ingredient of meal.ingredients) {
        const key = matchFood(ingredient.name).key;
        assert.notEqual(key, 'mushroom', meal.title);
        assert.equal(['salmon', 'shrimp', 'tilapia', 'canned_tuna'].includes(key), false, meal.title);
      }
    }
  });

  test('reuses ingredients rather than buying five separate weeks', () => {
    const { plan } = generateFromBank(baseRequest());
    assert.ok(plan.reuse.shared.length >= 5, `only ${plan.reuse.shared.length} shared ingredients`);
  });

  test('refuses an impossible budget instead of shrinking the servings', () => {
    const result = generateFromBank(baseRequest({ budget: 25, people: 4 }));
    assert.equal(result.ok, false);
    assert.equal(result.error, 'budget-too-low');
    assert.match(result.assessment.message, /Try increasing the budget/);
  });

  test('optimises a tight budget down and says what it changed', () => {
    const result = generateFromBank(baseRequest({ budget: 62, seed: 'tight' }));
    assert.equal(result.ok, true);
    // Either it got under, or it is honest about not managing it.
    if (!result.plan.budget.withinBudget) {
      assert.ok(result.plan.notices.some((notice) => /over/.test(notice.text)));
    }
    if (result.plan.adjustments.length > 0) {
      for (const adjustment of result.plan.adjustments) {
        assert.ok(adjustment.label);
        assert.ok(adjustment.saved > 0, 'an adjustment that saves nothing should be rolled back');
      }
    }
  });

  test('regenerating with a different seed gives a different week', () => {
    const first = generateFromBank(baseRequest({ seed: 'one' })).plan;
    const second = generateFromBank(baseRequest({ seed: 'two' })).plan;
    const overlap = first.meals.filter((meal) =>
      second.meals.some((other) => other.title === meal.title)
    ).length;
    assert.ok(overlap < first.meals.length, 'regenerate produced an identical plan');
  });

  test('an estimate-only store is labelled as an estimate', () => {
    const plan = generateFromBank(baseRequest({ store: { id: 'x', name: 'Some shop', catalogProvider: 'none' } })).plan;
    assert.equal(plan.catalog.mode, 'unpriced-estimate');
    assert.match(plan.catalog.disclosure, /may differ significantly/);
  });

  test('every priced plan carries the pricing disclosure', () => {
    const { plan } = generateFromBank(baseRequest());
    assert.match(plan.catalog.disclosure, /In-store prices and availability may differ/);
  });

  test('household size and leftovers change the servings, not the meal count', () => {
    const { plan } = generateFromBank(baseRequest({ people: 4, leftovers: 'extra-serving', budget: 240 }));
    assert.equal(plan.meals.length, 5);
    for (const meal of plan.meals) assert.equal(meal.servings, 5);
  });

  test('pantry items reduce the total', () => {
    const plain = generateFromBank(baseRequest()).plan;
    const stocked = generateFromBank(
      baseRequest({ pantryKeys: ['olive_oil', 'salt', 'black_pepper', 'white_rice'] })
    ).plan;
    assert.ok(stocked.totals.pantrySavings > 0);
    assert.ok(stocked.totals.subtotal < plain.totals.subtotal + 1);
  });
});

describe('meal swapping', () => {
  test('offers three safe alternatives with a price difference', () => {
    const { plan } = generateFromBank(baseRequest({ allergies: ['fish'] }));
    const options = swapOptions(plan, plan.meals[0].id);

    assert.equal(options.length, 3);
    for (const option of options) {
      assert.ok(typeof option.delta === 'number');
      assert.equal(
        option.recipe.ingredients.some((ingredient) => matchFood(ingredient.name)?.allergens.includes('fish')),
        false
      );
      assert.ok(option.recipe.totalTimeMinutes <= plan.request.maxCookMinutes);
    }
  });

  test('applying a swap recalculates the whole basket', () => {
    const { plan } = generateFromBank(baseRequest());
    const option = swapOptions(plan, plan.meals[0].id)[0];
    const result = applySwap(plan, plan.meals[0].id, option.recipe.id, { force: true });

    assert.equal(result.ok, true);
    assert.equal(result.plan.meals.length, plan.meals.length);
    assert.equal(result.plan.meals[0].title, option.recipe.title);
    assert.equal(result.plan.totals.subtotal, option.newTotal);
    assert.equal(
      result.plan.totals.subtotal,
      basketTotals(result.plan.groceryItems).subtotal,
      'totals must equal the sum of the items shown'
    );
  });

  test('refuses a swap that breaks the budget unless forced', () => {
    const { plan } = generateFromBank(baseRequest({ budget: 66, seed: 'swap' }));
    const pricey = swapOptions(plan, plan.meals[0].id).find((option) => option.delta > 0);
    if (!pricey) return; // nothing more expensive available; nothing to assert
    const blocked = applySwap(plan, plan.meals[0].id, pricey.recipe.id);
    if (!blocked.ok) {
      assert.equal(blocked.error, 'over-budget');
      const forced = applySwap(plan, plan.meals[0].id, pricey.recipe.id, { force: true });
      assert.equal(forced.ok, true);
    }
  });
});

describe('grocery list interactions', () => {
  test('marking an item as owned re-totals without re-pricing', () => {
    const { plan } = generateFromBank(baseRequest());
    const item = plan.groceryItems.find((entry) => entry.priced && !entry.pantry);
    const updated = setPantryItem(plan, item.id, true);

    assert.equal(updated.totals.subtotal, Math.round((plan.totals.subtotal - item.totalPrice) * 100) / 100);
    assert.equal(updated.groceryItems.find((entry) => entry.id === item.id).pantry, true);
    assert.equal(updated.budget.remaining > plan.budget.remaining, true);
  });

  test('the list is grouped into store departments and links back to meals', () => {
    const { plan } = generateFromBank(baseRequest());
    assert.ok(plan.categories.length > 1);
    for (const group of plan.categories) {
      for (const item of group.items) {
        assert.equal(item.category, group.category);
        assert.ok(item.meals.length > 0, `${item.name} is not used by any meal`);
      }
    }
  });
});

describe('AI-sourced plans', () => {
  const modelMeals = [
    {
      title: 'Chicken and Pepper Rice',
      description: 'Quick skillet dinner.',
      cuisine: 'American',
      dietary_tags: ['high-protein'],
      prep_time_minutes: 10,
      cook_time_minutes: 20,
      servings: 2,
      ingredients: [
        { name: 'Boneless chicken breast', quantity: 1, unit: 'lb' },
        { name: 'Long-grain white rice', quantity: 1, unit: 'cup' },
        { name: 'Bell peppers', quantity: 2, unit: 'each' },
      ],
      instructions: ['Cook the rice.', 'Sear the chicken.', 'Add peppers and serve.'],
      nutrition_per_serving: { calories: 600, protein_grams: 45, carb_grams: 60, fat_grams: 15 },
      // The model is not allowed an opinion on any of these:
      estimated_cost: 4.5,
      price: 19.99,
    },
  ];

  test('accepts model meals, prices them in code, and ignores its prices', () => {
    const validated = validatePlanResponse({ plan_title: 'Test', meals: modelMeals });
    const result = generateFromMeals(validated.meals, baseRequest({ mealCount: 3 }));

    assert.equal(result.ok, true);
    assert.equal(result.plan.source, 'ai');
    assert.equal(result.plan.meals.length, 3, 'the week is topped up from the bank');
    const fromModel = result.plan.meals.find((meal) => meal.title === 'Chicken and Pepper Rice');
    assert.ok(fromModel);
    assert.notEqual(fromModel.estimatedCost, 4.5, 'the cost must come from the catalog');
    assert.ok(fromModel.estimatedCost > 0);
  });

  test('drops a model meal that breaks an allergy and says so', () => {
    const unsafe = [
      {
        title: 'Cheesy Pasta',
        ingredients: [{ name: 'Shredded cheddar', quantity: 1, unit: 'cup' }],
        instructions: ['Melt it.'],
      },
    ];
    const validated = validatePlanResponse({ meals: unsafe });
    const result = generateFromMeals(validated.meals, baseRequest({ allergies: ['milk'], mealCount: 3, budget: 140 }));

    assert.equal(result.ok, true);
    assert.equal(
      result.plan.meals.some((meal) => meal.title === 'Cheesy Pasta'),
      false
    );
    assert.ok(result.plan.notices.some((notice) => /allergy and diet check/.test(notice.text)));
    for (const meal of result.plan.meals) assert.equal(meal.allergens.includes('milk'), false);
  });
});
