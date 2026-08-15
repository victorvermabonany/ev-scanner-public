// Small formatting helpers. Prices always show cents — a grocery total that
// reads "$92" invites the assumption it was rounded from something.

export const money = (amount) =>
  typeof amount === 'number' && Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '—';

export const minutes = (value) => (value >= 60 ? `${Math.round(value / 60)} hr` : `${value} min`);

export const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** "2 Aug" style, for saved plans. */
export const shortDate = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export const relativeDay = (iso) => {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (!Number.isFinite(days)) return '';
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  return `${Math.floor(days / 7)} weeks ago`;
};

// A picture per meal without shipping a picture per meal: a generated photo
// would be a fabrication of a dish nobody cooked, and stock imagery of the
// wrong food is worse than none. An emoji keyed off the recipe reads as a
// label rather than a promise.
const GLYPHS = [
  [/taco|burrito|quesadilla|wrap|shawarma/i, '🌯'],
  [/pasta|spaghetti|ziti|noodle|penne/i, '🍝'],
  [/rice|bowl|fried rice|risotto/i, '🍚'],
  [/soup|chili|curry|stew|lentil/i, '🍲'],
  [/salad|slaw/i, '🥗'],
  [/fish|salmon|tilapia|shrimp|scampi/i, '🐟'],
  [/burger|patty/i, '🍔'],
  [/egg|shakshuka|hash|frittata/i, '🍳'],
  [/chicken/i, '🍗'],
  [/beef|steak|sausage|pork/i, '🥩'],
  [/potato|sweet potato/i, '🥔'],
  [/tofu|stir-fry|stir fry|edamame/i, '🥢'],
  [/parm|bake|casserole|ziti/i, '🧀'],
];

export function mealGlyph(title = '') {
  for (const [pattern, glyph] of GLYPHS) if (pattern.test(title)) return glyph;
  return '🍽️';
}
