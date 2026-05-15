import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const CACHE_SECONDS = Number(process.env.CACHE_SECONDS || 45);
const MAX_PROP_EVENTS = Number(process.env.MAX_PROP_EVENTS || 10);
const PROVIDER = String(process.env.ODDS_PROVIDER || 'oddsapi').toLowerCase();
const API_KEY = process.env.ODDS_API_KEY || process.env.PROP_LINE_API_KEY || process.env.API_KEY || '';
const startedAt = new Date().toISOString();
const cache = new Map();

const BASES = {
  oddsapi: 'https://api.the-odds-api.com/v4',
  propline: 'https://api.prop-line.com/v1'
};

const PROP_MARKERS = [
  'player_', 'batter_', 'pitcher_',
  'anytime_td', 'shots_on_goal', 'total_saves'
];

function json(res, code, body, extraHeaders = {}) {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-headers': 'content-type',
    ...extraHeaders
  });
  res.end(JSON.stringify(body));
}

function isPropMarket(market) {
  return PROP_MARKERS.some(marker => String(market || '').includes(marker));
}

async function fetchJson(url) {
  const resp = await fetch(url);
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; }
  catch { data = { raw: text }; }
  if (!resp.ok) {
    const reason = data?.message || data?.error || text || `HTTP ${resp.status}`;
    const err = new Error(reason);
    err.status = resp.status;
    throw err;
  }
  return { data, headers: Object.fromEntries(resp.headers.entries()) };
}

function providerBase() {
  return BASES[PROVIDER] || BASES.oddsapi;
}

function providerName() {
  return PROVIDER === 'propline' ? 'PropLine' : 'The Odds API';
}

function providerKeyParam() {
  return PROVIDER === 'propline' ? 'apiKey' : 'apiKey';
}

async function fetchMainMarket({ sport, market, bookmakers, oddsFormat, regions }) {
  const params = new URLSearchParams({
    [providerKeyParam()]: API_KEY,
    regions: regions || 'us,us2,eu',
    markets: market,
    oddsFormat: oddsFormat || 'american',
    bookmakers: bookmakers || ''
  });
  const { data, headers } = await fetchJson(`${providerBase()}/sports/${sport}/odds?${params}`);
  return { data, headers };
}

async function fetchEventMarket({ sport, market, bookmakers, oddsFormat, regions }) {
  const eventsUrl = `${providerBase()}/sports/${sport}/events?${new URLSearchParams({ [providerKeyParam()]: API_KEY })}`;
  const { data: events, headers } = await fetchJson(eventsUrl);
  const out = [];
  for (const event of (Array.isArray(events) ? events : []).slice(0, MAX_PROP_EVENTS)) {
    const params = new URLSearchParams({
      [providerKeyParam()]: API_KEY,
      regions: regions || 'us,us2,eu',
      markets: market,
      oddsFormat: oddsFormat || 'american',
      bookmakers: bookmakers || ''
    });
    try {
      const { data } = await fetchJson(`${providerBase()}/sports/${sport}/events/${event.id}/odds?${params}`);
      if (data && Array.isArray(data.bookmakers) && data.bookmakers.length) out.push(data);
    } catch (err) {
      if (![404, 422].includes(err.status)) throw err;
    }
  }
  return { data: out, headers };
}

async function oddsPayload(params) {
  if (!API_KEY) throw Object.assign(new Error('Missing API key. Set ODDS_API_KEY, PROP_LINE_API_KEY, or API_KEY before starting the server.'), { status: 500 });
  if (isPropMarket(params.market)) return fetchEventMarket(params);
  return fetchMainMarket(params);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/health') {
    return json(res, 200, {
      ok: true,
      ready: Boolean(API_KEY),
      provider: providerName(),
      providerKey: PROVIDER,
      hasApiKey: Boolean(API_KEY),
      cacheSeconds: CACHE_SECONDS,
      maxPropEvents: MAX_PROP_EVENTS,
      startedAt
    });
  }

  if (url.pathname !== '/api/odds') {
    return json(res, 404, { error: 'Not found' });
  }

  const params = {
    sport: url.searchParams.get('sport') || 'baseball_mlb',
    market: url.searchParams.get('market') || 'h2h',
    bookmakers: url.searchParams.get('bookmakers') || '',
    oddsFormat: url.searchParams.get('oddsFormat') || 'american',
    regions: url.searchParams.get('regions') || 'us,us2,eu'
  };
  const key = JSON.stringify({ provider: PROVIDER, ...params });
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_SECONDS * 1000) {
    return json(res, 200, { data: cached.data, cached: true, updatedAt: new Date(cached.at).toISOString() }, cached.headers);
  }

  try {
    const { data, headers } = await oddsPayload(params);
    const quotaHeaders = {
      'x-requests-remaining': headers['x-requests-remaining'] || headers['x-ratelimit-remaining'] || '',
      'x-requests-used': headers['x-requests-used'] || headers['x-ratelimit-used'] || ''
    };
    cache.set(key, { at: Date.now(), data, headers: quotaHeaders });
    return json(res, 200, { data, cached: false, updatedAt: new Date().toISOString() }, quotaHeaders);
  } catch (err) {
    return json(res, err.status || 500, { error: err.message || 'Backend cache failed' });
  }
});

server.listen(PORT, () => {
  console.log(`EdgeLabs cache server running on http://localhost:${PORT}`);
  console.log(`Provider: ${PROVIDER} | cache: ${CACHE_SECONDS}s | max prop events: ${MAX_PROP_EVENTS}`);
});
