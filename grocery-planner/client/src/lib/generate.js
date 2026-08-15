// Driving one plan generation, start to finish.
//
// Two paths converge here. With an API key the model writes the recipes; with
// no key the built-in bank does. Everything after that — consolidation,
// product matching, package maths, the budget ladder — is identical, because
// it is all code either way.
//
// A model failure is not a dead end. The bank is a complete fallback, so a
// rate limit or a bad key costs the user a slightly less personalised week and
// an honest notice, not their questionnaire answers.

import { hasKey, requestMeals, describeFailure } from './anthropic.js';
import { generateFromBank, generateFromMeals } from '../../../shared/planner.js';

export const STAGES = [
  { id: 'creating', label: 'Creating meals' },
  { id: 'combining', label: 'Combining ingredients' },
  { id: 'store', label: 'Checking your store' },
  { id: 'budget', label: 'Balancing your budget' },
  { id: 'finalising', label: 'Finalising your week' },
];

// The last four stages are milliseconds of synchronous work. They are shown
// anyway — with a short dwell so they can be read — because a plan that
// appears instantly from a blank screen tells the user nothing about what was
// done on their behalf, and these are the steps that justify the number.
const DWELL_MS = 420;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generatePlan(request, { apiKey, model, onStage, signal } = {}) {
  const notices = [];
  const stage = (id, detail) => onStage?.(id, detail);

  stage('creating');

  let meals = null;
  if (hasKey(apiKey)) {
    try {
      const result = await requestMeals(request, {
        apiKey,
        model,
        signal,
        onProgress: (count) => stage('creating', `${count} of ${request.mealCount} written`),
      });
      meals = result.meals;
      if (result.title) request = { ...request, title: result.title };
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      const failure = describeFailure(error);
      notices.push({
        level: 'warning',
        text: `${failure.message} We planned your week from our own recipes instead.`,
      });
    }
  } else {
    await pause(DWELL_MS);
  }

  stage('combining');
  await pause(DWELL_MS);
  stage('store');
  await pause(DWELL_MS);
  stage('budget');

  const result = meals ? generateFromMeals(meals, request) : generateFromBank(request);
  if (!result.ok) return result;

  stage('finalising');
  await pause(DWELL_MS);

  return {
    ok: true,
    plan: { ...result.plan, notices: [...notices, ...result.plan.notices] },
  };
}
