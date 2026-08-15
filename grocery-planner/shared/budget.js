// The budget rules, in one place, in code.
//
// Two jobs. Before generating: is this budget realistic at all, and what
// should we actually aim for? After pricing: how far over are we, and what is
// the cheapest honest way down (PRD §13's ladder, in order).

export const BUDGET_LIMITS = { min: 20, max: 600 };

// Aim below the stated budget, not at it. Variable-weight products, price
// drift and substitutions all push the real till total up, and "you have
// $7.60 left" is a better outcome than "you were $2 over".
export const BUDGET_BUFFER = 0.93;

// What a dinner serving costs at the low end, at an average-priced store.
// Below this the plan stops being food and starts being rice.
const FLOOR_PER_SERVING = 2.4;
const COMFORTABLE_PER_SERVING = 4.25;

const round = (n) => Math.round(n * 100) / 100;

/** The number the optimiser actually aims for. */
export const internalTarget = (budget) => round(budget * BUDGET_BUFFER);

/** Servings a plan produces, given household size, meal count and leftovers. */
export function totalServings({ people, meals, leftovers = 'none' }) {
  const extra = leftovers === 'extra-serving' ? 1 : leftovers === 'lunch' ? people : 0;
  return meals * (people + extra);
}

export const servingsPerMeal = ({ people, leftovers = 'none' }) =>
  people + (leftovers === 'extra-serving' ? 1 : leftovers === 'lunch' ? people : 0);

/**
 * Can this week be bought for this money?
 *
 * `level` drives what the questionnaire does: 'ok' proceeds, 'tight' proceeds
 * with a warning, 'impossible' blocks with a concrete alternative, because
 * "we couldn't do it" without a number is not a useful error (PRD §22).
 */
export function assessBudget({ budget, people, meals, leftovers = 'none', priceIndex = 1 }) {
  const servings = totalServings({ people, meals, leftovers });
  const floor = round(servings * FLOOR_PER_SERVING * priceIndex);
  const comfortable = round(servings * COMFORTABLE_PER_SERVING * priceIndex);
  const amount = Number(budget);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { level: 'invalid', servings, floor, comfortable, message: 'Enter a weekly budget.' };
  }

  if (amount < floor) {
    return {
      level: 'impossible',
      servings,
      floor,
      comfortable,
      message:
        `We couldn't create ${meals} dinner${meals === 1 ? '' : 's'} for ${people} ` +
        `${people === 1 ? 'person' : 'people'} within $${amount.toFixed(0)}. ` +
        `That's ${servings} servings, which needs about $${floor.toFixed(0)} at this store. ` +
        'Try increasing the budget, planning fewer dinners, or cooking for fewer people.',
      suggestions: [
        { action: 'raise-budget', to: floor },
        { action: 'fewer-meals', to: Math.max(3, Math.floor(amount / (FLOOR_PER_SERVING * priceIndex * (people || 1)))) },
      ],
    };
  }

  if (amount < comfortable) {
    return {
      level: 'tight',
      servings,
      floor,
      comfortable,
      message:
        `$${amount.toFixed(0)} for ${servings} servings is tight but workable. ` +
        'Expect budget-first meals: beans, rice, eggs and chicken thighs rather than steak.',
    };
  }

  return { level: 'ok', servings, floor, comfortable, message: null };
}

/** Where the basket stands against the internal target. */
export function budgetStatus(subtotal, budget) {
  const target = internalTarget(budget);
  return {
    subtotal: round(subtotal),
    budget: round(budget),
    target,
    remaining: round(budget - subtotal),
    overTargetBy: round(Math.max(0, subtotal - target)),
    overBudgetBy: round(Math.max(0, subtotal - budget)),
    withinTarget: subtotal <= target,
    withinBudget: subtotal <= budget,
    // How full the bar on the dashboard is.
    usedFraction: budget > 0 ? Math.min(1.5, subtotal / budget) : 0,
  };
}

/**
 * The optimisation ladder, as data.
 *
 * The planner walks these in order and stops as soon as the basket fits. Kept
 * here rather than inline so the order is reviewable in one screen — it is a
 * product decision, not an implementation detail. Each step's `describe` is
 * what the user sees in the plan's "what we changed" list.
 */
export const OPTIMIZATION_STEPS = [
  {
    id: 'economy-packs',
    label: 'Cheaper brands and pack sizes',
    describe: (n) => `Switched ${n} item${n === 1 ? '' : 's'} to a cheaper brand or pack size`,
  },
  {
    id: 'cheaper-ingredients',
    label: 'Lower-cost equivalent ingredients',
    describe: (n) => `Swapped ${n} expensive ingredient${n === 1 ? '' : 's'} for a cheaper equivalent`,
  },
  {
    id: 'increase-overlap',
    label: 'More ingredient overlap',
    describe: (n) => `Rebuilt ${n} meal${n === 1 ? '' : 's'} around ingredients already in the basket`,
  },
  {
    id: 'replace-meal',
    label: 'Replace the most expensive meal',
    describe: (n) => `Replaced ${n} expensive meal${n === 1 ? '' : 's'} with a cheaper dinner`,
  },
  {
    id: 'drop-optional',
    label: 'Drop optional toppings and garnishes',
    describe: (n) => `Removed ${n} optional topping${n === 1 ? '' : 's'}`,
  },
  {
    id: 'reduce-variety',
    label: 'Reduce variety',
    describe: (n) => `Reused ${n} protein${n === 1 ? '' : 's'} across more meals`,
  },
];
