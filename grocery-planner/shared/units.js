// Measurement, in the only place that's allowed to do it.
//
// Recipes talk in cups, pounds and "2 onions". Store products come in
// 32 oz jars and 1.5 lb packs. Nothing can be consolidated or priced until
// both sides are expressed in the same numbers, so everything in this app
// converts to one of three canonical units first:
//
//   weight  → grams
//   volume  → millilitres
//   count   → each
//
// Weight and volume are different kinds and never convert into each other
// generically — a cup of flour and a cup of oil do not weigh the same. Where
// a specific food needs to cross that line (half an onion → grams of onion)
// the food's own record supplies the factor. See foods.js.

const WEIGHT = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.349523125,
  ounce: 28.349523125,
  ounces: 28.349523125,
  lb: 453.59237,
  lbs: 453.59237,
  pound: 453.59237,
  pounds: 453.59237,
};

const VOLUME = {
  ml: 1,
  millilitre: 1,
  millilitres: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  litre: 1000,
  litres: 1000,
  tsp: 4.92892159375,
  teaspoon: 4.92892159375,
  teaspoons: 4.92892159375,
  tbsp: 14.78676478125,
  tablespoon: 14.78676478125,
  tablespoons: 14.78676478125,
  'fl oz': 29.5735295625,
  'fluid ounce': 29.5735295625,
  'fluid ounces': 29.5735295625,
  cup: 236.5882365,
  cups: 236.5882365,
  pint: 473.176473,
  pints: 473.176473,
  quart: 946.352946,
  quarts: 946.352946,
  gallon: 3785.411784,
  gallons: 3785.411784,
};

// Everything that means "one of the thing". Recipes are inconsistent about
// this — "2 cloves garlic", "1 can black beans", "3 slices bacon" — and all
// of them are counts as far as the arithmetic is concerned. The food's own
// record decides how big one is.
const COUNT = new Set([
  '',
  'each',
  'ea',
  'count',
  'ct',
  'piece',
  'pieces',
  'whole',
  'clove',
  'cloves',
  'can',
  'cans',
  'jar',
  'jars',
  'package',
  'packages',
  'pack',
  'packs',
  'container',
  'containers',
  'bunch',
  'bunches',
  'head',
  'heads',
  'slice',
  'slices',
  'stalk',
  'stalks',
  'sprig',
  'sprigs',
  'loaf',
  'loaves',
  'dozen',
  'bag',
  'bags',
  'box',
  'boxes',
  'bottle',
  'bottles',
  'fillet',
  'fillets',
  'breast',
  'breasts',
  'thigh',
  'thighs',
  'ear',
  'ears',
  'link',
  'links',
  'leaf',
  'leaves',
  'sheet',
  'sheets',
  'stick',
  'sticks',
  'pinch',
  'dash',
  'handful',
  'to taste',
]);

/** Trims, lowercases and strips the plural/punctuation noise off a unit. */
export function cleanUnit(unit) {
  return String(unit ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ');
}

/** 'weight' | 'volume' | 'count' — what kind of measurement this unit is. */
export function unitKind(unit) {
  const u = cleanUnit(unit);
  if (u in WEIGHT) return 'weight';
  if (u in VOLUME) return 'volume';
  if (COUNT.has(u)) return 'count';
  return null;
}

/** The canonical unit for a kind. */
export const canonicalUnit = (kind) =>
  kind === 'weight' ? 'g' : kind === 'volume' ? 'ml' : 'each';

/**
 * A quantity in canonical units, or null when the unit isn't recognised.
 *
 * Returns the kind alongside the number, because a bare number is not enough
 * to know whether adding it to another one is meaningful.
 */
export function toCanonical(quantity, unit) {
  const amount = Number(quantity);
  if (!Number.isFinite(amount)) return null;

  const u = cleanUnit(unit);
  const kind = unitKind(u);
  if (!kind) return null;

  if (kind === 'weight') return { amount: amount * WEIGHT[u], kind, unit: 'g' };
  if (kind === 'volume') return { amount: amount * VOLUME[u], kind, unit: 'ml' };

  // A dozen is the one count word that isn't worth one.
  const each = u === 'dozen' ? amount * 12 : amount;
  return { amount: each, kind, unit: 'each' };
}

/**
 * Canonical amount back into something a person would write on a list.
 *
 * Deliberately conservative: it picks the largest unit that leaves a number
 * above 1, so 900 g reads as "2 lb" rather than "0.9 kg", and it rounds to
 * at most one decimal because nobody buys 1.37 lb of anything on purpose.
 */
export function fromCanonical(amount, kind, { imperial = true } = {}) {
  const round = (n) => Math.round(n * 10) / 10;

  if (kind === 'weight') {
    if (!imperial) return amount >= 1000 ? `${round(amount / 1000)} kg` : `${Math.round(amount)} g`;
    const oz = amount / WEIGHT.oz;
    if (oz >= 16) return `${round(oz / 16)} lb`;
    return `${round(oz)} oz`;
  }

  if (kind === 'volume') {
    if (!imperial) return amount >= 1000 ? `${round(amount / 1000)} L` : `${Math.round(amount)} ml`;
    if (amount >= VOLUME.cup) {
      const cups = round(amount / VOLUME.cup);
      return `${cups} ${cups === 1 ? 'cup' : 'cups'}`;
    }
    if (amount >= VOLUME.tbsp) return `${round(amount / VOLUME.tbsp)} tbsp`;
    return `${round(amount / VOLUME.tsp)} tsp`;
  }

  return round(amount) === 1 ? '1' : `${round(amount)}`;
}

/** Sum of like-kinded amounts, or null if the kinds disagree. */
export function addCanonical(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.kind !== b.kind) return null;
  return { amount: a.amount + b.amount, kind: a.kind, unit: a.unit };
}
