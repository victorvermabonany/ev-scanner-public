// What we ask the model for, and what we allow it to answer.
//
// Split deliberately: this file builds the request and reads the reply, and
// knows nothing about HTTP. The actual call lives in the client
// (client/src/lib/anthropic.js) because that's where the API key is. Keeping
// the prompt here means the tests can check its contents without a network.
//
// The division of labour the PRD asks for is enforced structurally, not
// politely: the model composes recipes from a fixed ingredient vocabulary and
// writes the instructions. It is never shown a price, never asked for one,
// and anything price-shaped in its reply is stripped by schema.js before the
// response is looked at.

import { FOODS } from './foods.js';
import { DIETS } from './safety.js';

/** The recipe-plan JSON schema. Structured outputs, so the shape is enforced. */
export function planSchema(mealCount) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['plan_title', 'meals'],
    properties: {
      plan_title: { type: 'string', description: 'Short name for the week, e.g. "Five high-protein dinners".' },
      meals: {
        type: 'array',
        description: `Exactly ${mealCount} dinners, all different.`,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'title', 'description', 'cuisine', 'dietary_tags',
            'prep_time_minutes', 'cook_time_minutes', 'servings',
            'ingredients', 'instructions', 'nutrition_per_serving',
          ],
          properties: {
            title: { type: 'string' },
            description: { type: 'string', description: 'One sentence, appetising, no marketing language.' },
            cuisine: { type: 'string' },
            dietary_tags: { type: 'array', items: { type: 'string' } },
            prep_time_minutes: { type: 'integer' },
            cook_time_minutes: { type: 'integer' },
            servings: { type: 'integer' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'quantity', 'unit'],
                properties: {
                  name: {
                    type: 'string',
                    description: 'Must be one of the allowed ingredient names, exactly as written.',
                  },
                  quantity: { type: 'number' },
                  unit: {
                    type: 'string',
                    description: 'lb, oz, cup, tbsp, tsp, fl oz, each, can, bunch, cloves, or clove.',
                  },
                  optional: { type: 'boolean', description: 'True for garnishes and toppings.' },
                },
              },
            },
            instructions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Four to seven steps, each a complete sentence.',
            },
            nutrition_per_serving: {
              type: 'object',
              additionalProperties: false,
              required: ['calories', 'protein_grams', 'carb_grams', 'fat_grams'],
              properties: {
                calories: { type: 'integer' },
                protein_grams: { type: 'integer' },
                carb_grams: { type: 'integer' },
                fat_grams: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  };
}

/**
 * The ingredient vocabulary, grouped by department.
 *
 * Constraining the model to foods the store actually stocks is what makes
 * "90% of ingredients get a usable product match" achievable. A free-form
 * recipe generator produces lovely recipes full of things nobody can price.
 */
export function ingredientVocabulary() {
  const groups = new Map();
  for (const food of FOODS) {
    if (!groups.has(food.category)) groups.set(food.category, []);
    groups.get(food.category).push(food.name);
  }
  return [...groups.entries()]
    .map(([category, names]) => `${category}: ${names.join(', ')}`)
    .join('\n');
}

export const SYSTEM_PROMPT = `You plan a week of dinners for a household shopping at one grocery store.

Write recipes a competent home cook can follow. Every ingredient must come from the allowed list, spelled exactly as given — the app matches those names to real store products, and anything else cannot be bought or priced.

Two things matter more than variety:

1. Safety. Allergies and dietary restrictions are absolute. A meal that breaks one is not a meal that needs adjusting; it is a meal that must not exist. Foods the household dislikes are near-absolute: avoid them unless there is no alternative.
2. Overlap. A week of five unrelated dinners means five half-used bags of things. Reuse proteins, vegetables and pantry items across meals — the same chicken in two dinners, the same peppers in three — while keeping the week interesting to eat.

Do not mention prices, costs, budgets, product brands or package sizes. You do not have that information; the app prices the plan from live store data after you have written it.`;

/** The per-request instructions. */
export function buildPrompt(request) {
  const {
    people, mealCount, servingsPerMeal, nutritionStyle, maxCookMinutes,
    diets = [], allergies = [], dislikes = [], cuisines = [], pantry = [],
    customInstructions = '', avoidTitles = [],
  } = request;

  const dietLabels = diets
    .map((id) => DIETS.find((diet) => diet.id === id)?.label ?? id)
    .join(', ');

  const lines = [
    `Plan ${mealCount} dinners for ${people} ${people === 1 ? 'person' : 'people'}.`,
    `Write every recipe for ${servingsPerMeal} servings.`,
    `Style: ${nutritionStyle}.`,
    `Nothing may take longer than ${maxCookMinutes} minutes from starting to eating.`,
  ];

  if (allergies.length > 0) {
    lines.push(
      `ALLERGIES — absolutely no ${allergies.join(', ')}, in any form, including as a minor ingredient.`
    );
  }
  if (dietLabels) lines.push(`Dietary requirements: ${dietLabels}.`);
  if (dislikes.length > 0) lines.push(`Do not use: ${dislikes.join(', ')}.`);
  if (cuisines.length > 0) lines.push(`Lean towards these cuisines: ${cuisines.join(', ')}.`);
  if (pantry.length > 0) {
    lines.push(
      `Already in the cupboard, so prefer recipes that use them: ${pantry.join(', ')}.`
    );
  }
  if (customInstructions.trim()) {
    lines.push(
      `The household also asked: "${customInstructions.trim()}". Follow this unless it conflicts with an allergy or dietary requirement, which always win.`
    );
  }
  if (avoidTitles.length > 0) {
    lines.push(`They have already seen these, so suggest something else: ${avoidTitles.join(', ')}.`);
  }

  lines.push('', 'Allowed ingredients — use these names exactly:', ingredientVocabulary());

  return lines.join('\n');
}

/** Everything the client needs to make the call, minus the key. */
export function buildRequest(request, { model, effort } = {}) {
  return {
    model,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildPrompt(request) }],
    output_config: {
      format: { type: 'json_schema', schema: planSchema(request.mealCount) },
      ...(effort ? { effort } : {}),
    },
  };
}

/** Pull the JSON out of a Messages API response. Throws with a readable reason. */
export function readPlanResponse(message) {
  if (message?.stop_reason === 'refusal') {
    const detail = message.stop_details?.explanation ?? 'no explanation given';
    throw new Error(`The model declined this request (${detail}).`);
  }

  const text = (message?.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!text.trim()) {
    // max_tokens with structured output means a truncated, unparseable object.
    const reason = message?.stop_reason === 'max_tokens' ? ' (response was cut short)' : '';
    throw new Error(`The model returned no plan${reason}.`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('The model returned something that was not a valid plan.');
  }
}
