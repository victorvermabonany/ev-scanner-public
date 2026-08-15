// The one place that talks to the Claude API.
//
// The key belongs to the visitor and lives in their browser, so the call is
// made from the browser — which needs `dangerouslyAllowBrowser`. That flag is
// named as a warning about the usual case (shipping *your* key to everyone's
// browser); here the key never leaves the device it was typed on, and nothing
// is proxied through a server we'd then have to trust with it.
//
// Everything about *what* to ask for lives in shared/ai.js. This file is
// transport: build, stream, hand back the parsed reply.

import { buildRequest, readPlanResponse } from '../../../shared/ai.js';
import { validatePlanResponse } from '../../../shared/schema.js';

/** Effort. Plan generation is a writing task, not a reasoning marathon. */
const EFFORT = 'medium';

export const hasKey = (apiKey) => typeof apiKey === 'string' && apiKey.trim().length > 10;

/**
 * Ask the model for a week of dinners.
 *
 * Streams, so the generation screen can show that something is happening
 * rather than a spinner over a blank page, and so a long reply can't hit an
 * HTTP timeout. Returns validated meals — never raw model output.
 */
export async function requestMeals(request, { apiKey, model, onProgress, signal } = {}) {
  // Imported here rather than at the top of the module so the SDK is a
  // separate chunk: someone planning from the built-in recipes never
  // downloads it, which is most of the app's JavaScript.
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const stream = client.messages.stream(
    buildRequest(request, { model, effort: EFFORT }),
    { signal }
  );

  // Rough progress: the reply is one JSON object, so counting the meal titles
  // as they stream in is the most honest signal available.
  if (onProgress) {
    let seen = 0;
    stream.on('text', (delta) => {
      const titles = (delta.match(/"title"/g) ?? []).length;
      if (titles > 0) {
        seen += titles;
        onProgress(Math.min(seen, request.mealCount));
      }
    });
  }

  const message = await stream.finalMessage();
  const parsed = readPlanResponse(message);
  const validated = validatePlanResponse(parsed, { expectedMeals: request.mealCount });

  if (!validated.ok) {
    throw new Error(
      validated.errors[0] ?? 'The model returned a plan we could not read.'
    );
  }

  return { meals: validated.meals, title: validated.title, warnings: validated.errors };
}

/**
 * Turn an SDK error into something worth showing a person.
 *
 * The distinction that matters is "your key is wrong" versus "try again in a
 * minute" versus "we'll use the built-in recipes instead" — the last of which
 * is not really an error at all.
 */
export function describeFailure(error) {
  const status = error?.status;

  if (error?.name === 'AbortError') return { retry: false, message: 'Generation cancelled.' };
  if (status === 401) {
    return { retry: false, message: 'That API key was rejected. Check it in Preferences.' };
  }
  if (status === 403) {
    return { retry: false, message: "That API key doesn't have access to this model." };
  }
  if (status === 429) {
    return { retry: true, message: 'Rate limited by the API. Waiting a minute usually fixes it.' };
  }
  if (status === 400 && /credit|billing/i.test(error?.message ?? '')) {
    return { retry: false, message: 'The API account is out of credit.' };
  }
  if (status >= 500) {
    return { retry: true, message: 'The API had a problem. Trying again usually works.' };
  }
  if (error?.message?.includes('fetch') || error?.name === 'APIConnectionError') {
    return { retry: true, message: 'Could not reach the API. Check your connection.' };
  }

  return { retry: true, message: error?.message ?? 'Something went wrong generating the plan.' };
}
