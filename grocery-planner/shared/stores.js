// Which stores this build supports, and where.
//
// V1 supports a limited set of retailers on purpose (PRD §5): a plan is only
// trustworthy where there is catalog data behind it. A ZIP outside these areas
// gets the "no supported stores nearby" path, not a quietly invented store.
//
// The retailers here are the demo catalog's own — they are not real chains.
// Naming a real supermarket next to prices that came from a bundled snapshot
// would imply live data this build does not have. Wiring a real retailer means
// adding it here and giving catalog.js a provider that can talk to it.

/** Retailer-level positioning. priceIndex multiplies the snapshot's base prices. */
export const RETAILERS = [
  {
    id: 'valu-foods',
    name: 'Valu Foods',
    positioning: 'Discount, limited range',
    priceIndex: 0.88,
    // Foods this retailer doesn't stock. Real catalogs have holes; the plan
    // has to cope with them rather than assume everything exists everywhere.
    gaps: ['chipotle_adobo', 'basil', 'naan', 'quinoa', 'frozen_edamame', 'heavy_cream'],
  },
  {
    id: 'northside-market',
    name: 'Northside Market',
    positioning: 'Full-range supermarket',
    priceIndex: 1.0,
    gaps: [],
  },
  {
    id: 'greenleaf',
    name: 'GreenLeaf Market',
    positioning: 'Natural and organic',
    priceIndex: 1.22,
    gaps: ['taco_seasoning', 'tortilla_chips'],
  },
];

export const RETAILER_BY_ID = new Map(RETAILERS.map((retailer) => [retailer.id, retailer]));

// Supported metros. `zips` are matched on prefix, and costIndex is the local
// cost-of-living nudge that sits on top of the retailer's own positioning.
const AREAS = [
  {
    id: 'nyc',
    city: 'New York',
    state: 'NY',
    zips: ['100', '101', '102', '111', '112'],
    costIndex: 1.18,
    locations: [
      ['northside-market', '1240 Second Avenue', '10021'],
      ['valu-foods', '655 Atlantic Avenue', '11217'],
      ['greenleaf', '95 Prince Street', '10012'],
    ],
  },
  {
    id: 'chi',
    city: 'Chicago',
    state: 'IL',
    zips: ['606', '607', '608'],
    costIndex: 1.02,
    locations: [
      ['northside-market', '3030 N Broadway', '60657'],
      ['valu-foods', '4400 S Pulaski Road', '60632'],
      ['greenleaf', '1550 N Damen Avenue', '60622'],
    ],
  },
  {
    id: 'sf',
    city: 'San Francisco',
    state: 'CA',
    zips: ['941', '944', '945', '946', '947'],
    costIndex: 1.24,
    locations: [
      ['northside-market', '2020 Market Street', '94114'],
      ['valu-foods', '1750 Fulton Street', '94117'],
      ['greenleaf', '450 Rhode Island Street', '94107'],
    ],
  },
  {
    id: 'atx',
    city: 'Austin',
    state: 'TX',
    zips: ['733', '735', '786', '787', '788'],
    costIndex: 0.96,
    locations: [
      ['northside-market', '4001 S Lamar Boulevard', '78704'],
      ['valu-foods', '7112 Ed Bluestein Boulevard', '78723'],
      ['greenleaf', '1000 E 41st Street', '78751'],
    ],
  },
  {
    id: 'bos',
    city: 'Boston',
    state: 'MA',
    zips: ['019', '021', '022', '024'],
    costIndex: 1.14,
    locations: [
      ['northside-market', '181 Cambridge Street', '02114'],
      ['valu-foods', '400 Western Avenue', '02135'],
      ['greenleaf', '15 Washington Street', '02143'],
    ],
  },
];

/** Loose US ZIP check — five digits, optional +4 that we ignore. */
export const isValidZip = (zip) => /^\d{5}(-\d{4})?$/.test(String(zip ?? '').trim());

const areaForZip = (zip) => {
  const prefix = String(zip).slice(0, 3);
  return AREAS.find((area) => area.zips.includes(prefix)) ?? null;
};

function buildStore(area, [retailerId, address, zip]) {
  const retailer = RETAILER_BY_ID.get(retailerId);
  return {
    id: `${area.id}-${retailerId}`,
    retailerId,
    retailer: retailer.name,
    positioning: retailer.positioning,
    name: `${retailer.name} — ${address.replace(/^\d+\s/, '')}`,
    address,
    city: area.city,
    state: area.state,
    zip,
    areaId: area.id,
    // What the pricing layer multiplies the snapshot by for this location.
    priceIndex: Math.round(retailer.priceIndex * area.costIndex * 1000) / 1000,
    catalogProvider: 'bundled-snapshot',
  };
}

/**
 * Supported stores near a ZIP.
 *
 * Returns `{ ok: false, reason }` rather than an empty list, because "that
 * ZIP isn't a real ZIP" and "we don't cover that area yet" need different
 * messages on screen.
 */
export function findStores(zip) {
  const trimmed = String(zip ?? '').trim();
  if (!isValidZip(trimmed)) {
    return { ok: false, reason: 'invalid-zip', stores: [] };
  }

  const area = areaForZip(trimmed);
  if (!area) {
    return {
      ok: false,
      reason: 'unsupported-area',
      stores: [],
      supportedCities: AREAS.map((a) => `${a.city}, ${a.state}`),
    };
  }

  return {
    ok: true,
    area: { city: area.city, state: area.state },
    stores: area.locations.map((location) => buildStore(area, location)),
  };
}

export function getStore(storeId) {
  for (const area of AREAS) {
    const match = area.locations.find(([retailerId]) => `${area.id}-${retailerId}` === storeId);
    if (match) return buildStore(area, match);
  }
  return null;
}

/** Every supported store, for the "where do you work?" copy on the landing page. */
export const SUPPORTED_CITIES = AREAS.map((area) => ({
  city: area.city,
  state: area.state,
  zipExample: area.locations[0][2],
}));
