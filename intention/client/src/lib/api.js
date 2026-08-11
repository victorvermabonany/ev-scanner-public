import { todayIso } from '../../../shared/streak.js';

/**
 * "Today" is decided by the browser and sent along, so the day rolls over on
 * the user's clock rather than the server's.
 */
async function request(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'The app could not reach its data.');
  }
  return response.json();
}

export function fetchSummary() {
  return request(`/api/summary?today=${todayIso()}`);
}

export function saveCheckIn(mood) {
  return request('/api/check-ins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: todayIso(), mood }),
  });
}
