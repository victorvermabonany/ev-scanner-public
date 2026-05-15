const STORE = {
  settings: 'edgelab_settings_v1',
  bets: 'edgelab_bets_v1',
  selectedBooks: 'edgelab_selected_books_v1',
  cache: 'edgelab_feed_cache_v1',
  filters: 'edgelab_filters_v1'
};

const BOOKS = [
  { key: 'draftkings', name: 'DraftKings', type: 'soft', url: 'https://sportsbook.draftkings.com/' },
  { key: 'fanduel', name: 'FanDuel', type: 'soft', url: 'https://sportsbook.fanduel.com/' },
  { key: 'betmgm', name: 'BetMGM', type: 'soft', url: 'https://sports.betmgm.com/' },
  { key: 'betrivers', name: 'BetRivers', type: 'soft', url: 'https://www.betrivers.com/' },
  { key: 'williamhill_us', name: 'Caesars', type: 'soft', url: 'https://www.caesars.com/sportsbook-and-casino' },
  { key: 'espnbet', name: 'ESPN BET', type: 'soft', url: 'https://espnbet.com/' },
  { key: 'fanatics', name: 'Fanatics', type: 'soft', url: 'https://sportsbook.fanatics.com/' },
  { key: 'bet365', name: 'Bet365', type: 'soft', url: 'https://www.bet365.com/' },
  { key: 'hardrockbet', name: 'Hard Rock', type: 'soft', url: 'https://app.hardrock.bet/' },
  { key: 'bovada', name: 'Bovada', type: 'sharp', url: 'https://www.bovada.lv/' },
  { key: 'pinnacle', name: 'Pinnacle', type: 'sharp', url: 'https://www.pinnacle.com/' },
  { key: 'betonlineag', name: 'BetOnline', type: 'sharp', url: 'https://www.betonline.ag/' },
  { key: 'lowvig', name: 'LowVig', type: 'sharp', url: 'https://www.lowvig.ag/' },
  { key: 'unibet', name: 'Unibet', type: 'soft', url: 'https://www.unibet.com/' },
  { key: 'underdog', name: 'Underdog', type: 'dfs', url: 'https://underdogfantasy.com/' },
  { key: 'prizepicks', name: 'PrizePicks', type: 'dfs', url: 'https://www.prizepicks.com/' },
  { key: 'kalshi', name: 'Kalshi', type: 'exchange', url: 'https://kalshi.com/' },
  { key: 'polymarket', name: 'Polymarket', type: 'exchange', url: 'https://polymarket.com/' },
  { key: 'matchbook', name: 'Matchbook', type: 'exchange', url: 'https://www.matchbook.com/' },
  { key: 'smarkets', name: 'Smarkets', type: 'exchange', url: 'https://smarkets.com/' }
];
const SHARP_KEYS = ['pinnacle','betonlineag','lowvig','bovada','matchbook','smarkets','kalshi','polymarket'];
const DEFAULT_BOOKS = ['draftkings','fanduel','betmgm','betrivers','williamhill_us','espnbet','fanatics','bet365','pinnacle','betonlineag','bovada','lowvig'];
const BOOK_GROUPS = [
  { id: 'soft', label: 'Recreational books', keys: BOOKS.filter(book => book.type === 'soft').map(book => book.key), open: false },
  { id: 'sharp', label: 'Sharp references', keys: BOOKS.filter(book => book.type === 'sharp').map(book => book.key), open: false },
  { id: 'dfs', label: 'Props apps', keys: BOOKS.filter(book => book.type === 'dfs').map(book => book.key), open: false },
  { id: 'exchange', label: 'Exchanges', keys: BOOKS.filter(book => book.type === 'exchange').map(book => book.key), open: false }
];
const OPTICODDS_LEAGUES = {
  baseball_mlb: { sport: 'baseball', league: 'mlb' },
  basketball_nba: { sport: 'basketball', league: 'nba' },
  basketball_wnba: { sport: 'basketball', league: 'wnba' },
  americanfootball_nfl: { sport: 'football', league: 'nfl' },
  icehockey_nhl: { sport: 'hockey', league: 'nhl' },
  soccer_usa_mls: { sport: 'soccer', league: 'mls' }
};
const OPTICODDS_BOOKS = {
  draftkings: 'DraftKings',
  fanduel: 'FanDuel',
  betmgm: 'BetMGM',
  betrivers: 'BetRivers',
  williamhill_us: 'Caesars',
  espnbet: 'ESPN BET',
  fanatics: 'Fanatics',
  bet365: 'Bet365',
  hardrockbet: 'Hard Rock',
  bovada: 'Bovada',
  pinnacle: 'Pinnacle',
  betonlineag: 'BetOnline',
  lowvig: 'LowVig',
  unibet: 'Unibet',
  kalshi: 'Kalshi',
  polymarket: 'Polymarket',
  matchbook: 'Matchbook',
  smarkets: 'Smarkets'
};
const SPORTS = [
  ['all', 'All sports'],
  ['baseball_mlb', 'MLB'],
  ['basketball_nba', 'NBA'],
  ['basketball_wnba', 'WNBA'],
  ['americanfootball_nfl', 'NFL'],
  ['icehockey_nhl', 'NHL'],
  ['soccer_usa_mls', 'MLS']
];
const MARKETS = [
  ['all', 'Main lines'],
  ['h2h', 'Moneyline'],
  ['spreads', 'Spread'],
  ['totals', 'Total'],
  ['props', 'Player props']
];
const MAIN_MARKETS = ['h2h','spreads','totals'];
const PROP_MARKETS_BY_SPORT = {
  baseball_mlb: ['batter_hits','batter_total_bases','batter_rbis','pitcher_strikeouts','pitcher_outs'],
  basketball_nba: ['player_points','player_rebounds','player_assists','player_threes','player_points_rebounds_assists'],
  basketball_wnba: ['player_points','player_rebounds','player_assists','player_threes'],
  americanfootball_nfl: ['player_pass_yds','player_rush_yds','player_receptions','player_reception_yds','player_anytime_td'],
  icehockey_nhl: ['player_points','player_assists','player_shots_on_goal','player_total_saves'],
  soccer_usa_mls: ['player_goal_scorer_anytime','player_shots_on_target','player_shots','player_assists']
};
const PROP_MARKETS = Array.from(new Set(Object.values(PROP_MARKETS_BY_SPORT).flat()));
const FREE_SOURCES = [
  { name: 'OpticOdds', detail: 'Paid serious feed with 100+ books, fixtures, odds snapshots, streaming, props, history, deep links, and limits where available.', url: 'https://opticodds.com/sports-betting-api', best: 'Best paid upgrade' },
  { name: 'PropLine', detail: '1,000 free requests/day, props-first, The Odds API compatible, 13 books plus exchanges.', url: 'https://www.prop-line.com/', best: 'Best free prop feed' },
  { name: 'The Odds API', detail: 'Reliable compatible odds shape, smaller free quota, good for main lines.', url: 'https://the-odds-api.com/', best: 'Simple baseline' },
  { name: 'Odds-API.io', detail: 'Free tier advertises 100 requests/hour and live/pre-match odds; use through custom adapter if needed.', url: 'https://odds-api.io/pricing/free', best: 'Extra free source' },
  { name: 'BetStack', detail: 'Free forever consensus odds and scores with 60-second rate limit; useful for scoreboard context.', url: 'https://api.betstack.dev/', best: 'Consensus context' }
];

let settings = loadJson(STORE.settings, {
  provider: 'backend',
  keyMap: {},
  customEndpoint: '',
  backendEndpoint: 'http://localhost:8787',
  cacheMinutes: 3,
  refreshSeconds: 90,
  staleSeconds: 75,
  maxPropEvents: 10,
  bankroll: 350,
  unitPct: 3
});
settings.keyMap = settings.keyMap && typeof settings.keyMap === 'object' ? settings.keyMap : {};
let selectedBooks = cleanBookKeys(loadJson(STORE.selectedBooks, DEFAULT_BOOKS));
let bets = loadJson(STORE.bets, []);
let feedCache = loadJson(STORE.cache, {});
let loadedGames = [];
let evResults = [];
let arbResults = [];
let selectedResultKey = '';
let selectedOddsEventId = '';
let watchTimer = null;
let quota = { used: 0, remaining: '?' };
let lastFetchAt = 0;
let lastCacheHit = false;
let lastError = '';
let backendHealth = { checked: false, ok: false, ready: false, message: 'Backend not checked yet.' };

function $(id) { return document.getElementById(id); }
function loadJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value == null ? fallback : value;
  } catch { return fallback; }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
function numberOr(value, fallback) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}
function unique(items) { return Array.from(new Set(items.filter(Boolean))); }
function bookByKey(key) { return BOOKS.find(b => b.key === key) || { key, name: key, type: 'soft', url: '' }; }
function cleanBookKeys(keys, fallback = DEFAULT_BOOKS, allowEmpty = false) {
  const raw = Array.isArray(keys) ? keys : fallback;
  const selected = new Set(raw.map(String).filter(Boolean));
  const clean = BOOKS.map(book => book.key).filter(key => selected.has(key));
  return clean.length || allowEmpty ? clean : fallback.slice();
}
function selectedProviderKeys() {
  const entry = settings.keyMap[settings.provider] || { keys: [], active: 0 };
  const keys = Array.isArray(entry.keys) ? unique(entry.keys.map(String).map(s => s.trim())) : [];
  const active = Math.max(0, Math.min(numberOr(entry.active, 0), Math.max(0, keys.length - 1)));
  return { keys, active, key: keys[active] || '' };
}
function saveProviderKeys(keys, active = 0) {
  settings.keyMap[settings.provider] = { keys: unique(keys), active };
  saveSettings();
}
function saveSettings() { saveJson(STORE.settings, settings); }
function activeSports(value) { return value === 'all' ? SPORTS.filter(s => s[0] !== 'all').map(s => s[0]) : [value]; }
function marketsFor(filter, sport) {
  if (filter === 'all') return MAIN_MARKETS;
  if (filter === 'props') return PROP_MARKETS_BY_SPORT[sport] || [];
  return [filter];
}
function isPropMarket(market) { return PROP_MARKERS.has(market) || market.startsWith('player_') || market.startsWith('batter_') || market.startsWith('pitcher_'); }
const PROP_MARKERS = new Set(PROP_MARKETS);
function prettySport(key) { return (SPORTS.find(s => s[0] === key) || [key, key])[1]; }
function prettyMarket(key) {
  const labels = {
    h2h: 'Moneyline', spreads: 'Spread', totals: 'Total',
    batter_hits: 'Batter Hits', batter_total_bases: 'Total Bases', batter_rbis: 'RBIs', pitcher_strikeouts: 'Pitcher Ks', pitcher_outs: 'Pitcher Outs',
    player_points: 'Player Points', player_rebounds: 'Player Rebounds', player_assists: 'Player Assists', player_threes: 'Player Threes',
    player_points_rebounds_assists: 'PRA', player_pass_yds: 'Pass Yards', player_rush_yds: 'Rush Yards', player_receptions: 'Receptions',
    player_reception_yds: 'Receiving Yards', player_anytime_td: 'Anytime TD', player_shots_on_goal: 'Shots on Goal',
    player_total_saves: 'Goalie Saves', player_goal_scorer_anytime: 'Anytime Goal'
  };
  return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}
function money(n) { const v = Number.isFinite(n) ? n : 0; return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2); }
function signedMoney(n) { const v = Number.isFinite(n) ? n : 0; return (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(2); }
function fmtPct(n, digits = 2) { return Number.isFinite(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%` : '--'; }
function fmtOdds(n) { const v = parseFloat(n); return Number.isFinite(v) ? (v > 0 ? `+${Math.round(v)}` : String(Math.round(v))) : '--'; }
function formatTime(value) {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function isLiveGame(game) {
  if (game.in_play === true || game.live === true || game.status === 'in_play') return true;
  const start = new Date(game.commence_time).getTime();
  if (!Number.isFinite(start)) return false;
  return (start - Date.now()) / 60000 <= 10;
}
function unitStake() { return +(settings.bankroll * settings.unitPct / 100).toFixed(2); }
function kellyStake(prob, odds) {
  const dec = amToDec(odds);
  if (!Number.isFinite(prob) || !Number.isFinite(dec)) return unitStake();
  const b = dec - 1;
  const fullKelly = ((b * prob) - (1 - prob)) / b;
  if (!Number.isFinite(fullKelly) || fullKelly <= 0) return 0;
  return +Math.min(settings.bankroll * fullKelly * .25, settings.bankroll * .05).toFixed(2);
}

function init() {
  migrateRealMode();
  fillSelect('ev_sport', SPORTS);
  fillSelect('arb_sport', SPORTS);
  fillSelect('ev_market', MARKETS);
  fillSelect('arb_market', MARKETS);
  hydrateSettings();
  renderBookChips();
  renderFreeSources();
  bindEvents();
  renderAll();
  bootInitialFeed();
  setInterval(renderStatus, 30000);
  refreshIcons();
}
function migrateRealMode() {
  const key = 'edgelab_real_mode_migration_v1';
  if (!localStorage.getItem(key) && settings.provider === 'demo') {
    settings.provider = 'backend';
    saveSettings();
  }
  localStorage.setItem(key, '1');
  const bookKey = 'edgelab_core_books_migration_v1';
  if (!localStorage.getItem(bookKey) && selectedBooks.length === BOOKS.length) {
    selectedBooks = DEFAULT_BOOKS.slice();
    saveJson(STORE.selectedBooks, selectedBooks);
  }
  localStorage.setItem(bookKey, '1');
}
function fillSelect(id, rows) { $(id).innerHTML = rows.map(([v, l]) => `<option value="${v}">${l}</option>`).join(''); }
function refreshIcons() { if (window.lucide) window.lucide.createIcons(); }
function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
  document.querySelectorAll('[data-jump]').forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.jump)));
  $('global_search').addEventListener('input', renderResults);
  $('ev_scan_btn').addEventListener('click', scanEV);
  $('ev_clear_btn').addEventListener('click', () => { evResults = []; renderResults(); toast('EV results cleared.'); });
  $('ev_export_btn').addEventListener('click', () => exportCsv(currentEVRows(), 'edgelab-ev-results.csv'));
  $('arb_scan_btn').addEventListener('click', scanArbs);
  $('arb_export_btn').addEventListener('click', () => exportCsv(currentArbRows().map(flattenArbRow), 'edgelab-arb-results.csv'));
  $('odds_reload_btn').addEventListener('click', () => renderOddsScreen());
  $('refresh_all_btn').addEventListener('click', refreshActive);
  $('watch_btn').addEventListener('click', toggleWatch);
  $('save_settings_btn').addEventListener('click', saveSettingsFromInputs);
  $('provider_mode').addEventListener('change', switchProvider);
  $('test_backend_btn').addEventListener('click', () => checkBackendHealth(false));
  $('manual_add_btn').addEventListener('click', addManualBet);
  $('export_tracker_btn').addEventListener('click', () => exportJson({ bets }, 'edgelab-tracker.json'));
  $('export_all_btn').addEventListener('click', () => exportJson({ settings, selectedBooks, bets }, 'edgelab-backup.json'));
  $('import_all_file').addEventListener('change', importAll);
  $('clear_cache_btn').addEventListener('click', clearFeedCache);
  $('wipe_btn').addEventListener('click', wipeLocal);
  document.querySelectorAll('[data-calc]').forEach(btn => btn.addEventListener('click', () => runCalc(btn.dataset.calc)));
  document.querySelectorAll('[data-live-filter]').forEach(el => el.addEventListener('change', renderResults));
  document.addEventListener('click', handleActions);
}
function showTab(name) {
  document.querySelectorAll('[data-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(panel => panel.classList.toggle('active', panel.id === name));
  refreshIcons();
}
function hydrateSettings() {
  $('provider_mode').value = settings.provider || 'demo';
  hydrateProviderKeys();
  $('backend_endpoint').value = settings.backendEndpoint || 'http://localhost:8787';
  $('custom_endpoint').value = settings.customEndpoint || '';
  $('cache_minutes').value = settings.cacheMinutes ?? 3;
  $('refresh_seconds').value = settings.refreshSeconds ?? 90;
  $('stale_seconds').value = settings.staleSeconds ?? 75;
  $('max_prop_events').value = settings.maxPropEvents ?? 10;
  $('bankroll').value = settings.bankroll ?? 350;
  $('unit_pct').value = settings.unitPct ?? 3;
  $('manual_stake').value = unitStake();
}
function hydrateProviderKeys() {
  const current = selectedProviderKeys();
  $('api_key').value = current.key;
  $('api_keys').value = current.keys.filter(k => k !== current.key).join('\n');
}
function readKeyInputs() {
  return unique([$('api_key').value.trim(), ...$('api_keys').value.split(/\n|,/).map(s => s.trim())]);
}
function switchProvider() {
  saveProviderKeys(readKeyInputs(), selectedProviderKeys().active);
  settings.provider = $('provider_mode').value;
  hydrateProviderKeys();
  quota = { used: 0, remaining: '?' };
  saveSettings();
  renderStatus();
  toast(`Switched to ${providerLabel()}.`);
}
function saveSettingsFromInputs() {
  settings.provider = $('provider_mode').value;
  settings.backendEndpoint = normalizeEndpoint($('backend_endpoint').value.trim() || 'http://localhost:8787');
  settings.customEndpoint = $('custom_endpoint').value.trim();
  settings.cacheMinutes = Math.max(0, numberOr($('cache_minutes').value, 3));
  settings.refreshSeconds = Math.max(30, numberOr($('refresh_seconds').value, 90));
  settings.staleSeconds = Math.max(15, numberOr($('stale_seconds').value, 75));
  settings.maxPropEvents = Math.max(1, Math.min(30, numberOr($('max_prop_events').value, 10)));
  settings.bankroll = Math.max(0, numberOr($('bankroll').value, 350));
  settings.unitPct = Math.max(.1, numberOr($('unit_pct').value, 3));
  saveProviderKeys(readKeyInputs(), selectedProviderKeys().active);
  saveSettings();
  hydrateSettings();
  renderAll();
  toast('Settings saved.');
}
function providerLabel() {
  return { demo: 'Demo', opticodds: 'OpticOdds', propline: 'PropLine', oddsapi: 'The Odds API', backend: 'Backend cache', custom: 'Custom' }[settings.provider] || 'Demo';
}
function providerNeedsKey() { return settings.provider === 'opticodds' || settings.provider === 'propline' || settings.provider === 'oddsapi'; }
function providerReady() {
  if (settings.provider === 'demo') return '';
  if (settings.provider === 'backend') return settings.backendEndpoint ? '' : 'Add your backend cache endpoint in Settings.';
  if (settings.provider === 'custom') return settings.customEndpoint ? '' : 'Add a custom endpoint template in Settings.';
  return selectedProviderKeys().key ? '' : `Add your ${providerLabel()} key in Settings.`;
}
function normalizeEndpoint(value) {
  return String(value || '').replace(/\/+$/, '');
}
function renderStatus() {
  const missing = providerReady();
  const fresh = freshnessState();
  $('source_badge').textContent = providerLabel();
  $('source_badge').className = `pill ${missing ? 'warn' : 'ok'}`;
  $('fresh_badge').textContent = fresh.label;
  $('fresh_badge').className = `pill ${fresh.tone}`;
  $('quota_badge').textContent = quotaLabel();
  $('quota_badge').className = `pill ${quota.remaining === '?' ? 'blue' : 'blue'}`;
  $('side_source').textContent = `${providerLabel()} feed`;
  $('settings_provider_tag').textContent = providerLabel();
  $('dash_provider').textContent = providerLabel();
  $('dash_provider_sub').textContent = providerSubtitle(missing);
  $('unit_tag').textContent = `${money(unitStake())} unit`;
  if ($('backend_health')) $('backend_health').textContent = backendHealth.message;
  renderFeedBanner();
}
function renderFeedBanner() {
  const el = $('feed_banner');
  if (!el) return;
  const state = feedBannerState();
  el.className = `feed-banner ${state.show ? 'show' : ''} ${state.tone}`;
  $('feed_banner_title').textContent = state.title;
  $('feed_banner_text').textContent = state.text;
}
function feedBannerState() {
  if (lastError) return { show: true, tone: 'err', title: 'Feed Error', text: lastError };
  if (settings.provider === 'demo') return { show: true, tone: 'warn', title: 'Demo Mode', text: 'This board is using test odds. Switch to backend/live mode for real odds.' };
  if (settings.provider === 'backend' && backendHealth.checked && !backendHealth.ready) {
    return { show: true, tone: backendHealth.ok ? 'warn' : 'err', title: backendHealth.ok ? 'Backend Needs Key' : 'Feed Offline', text: backendHealth.message };
  }
  if (settings.provider === 'backend' && !backendHealth.checked) {
    return { show: true, tone: 'warn', title: 'Backend Not Checked', text: 'Click Test Backend in Settings, or start the real odds backend.' };
  }
  if (providerReady()) return { show: true, tone: 'warn', title: 'Live Feed Setup Needed', text: providerReady() };
  if (loadedGames.length) return { show: false, tone: 'ok', title: 'Feed Connected', text: freshnessState().label };
  return { show: true, tone: 'warn', title: 'Ready For Real Odds', text: 'Run a scan after your backend or live key is connected.' };
}
function quotaLabel() {
  if (settings.provider === 'demo') return 'Demo mode';
  if (quota.remaining !== '?') return `${quota.remaining} req left`;
  return `${selectedBooks.length} books`;
}
function providerSubtitle(missing) {
  if (settings.provider === 'demo') return 'demo/test data only';
  if (settings.provider === 'backend') return backendHealth.ready ? 'real odds backend ready' : (missing || 'start backend server');
  return missing || 'live-ready';
}
function freshnessState() {
  if (lastError) return { label: 'Load error', tone: 'err' };
  if (!lastFetchAt) return { label: loadedGames.length ? `${loadedGames.length} demo events` : 'No scan yet', tone: settings.provider === 'demo' ? 'blue' : 'warn' };
  const ageMs = Date.now() - lastFetchAt;
  const stale = ageMs > (settings.staleSeconds || 75) * 1000;
  const suffix = lastCacheHit ? ' cached' : '';
  return { label: `${ageLabel(ageMs)}${suffix}`, tone: stale ? 'warn' : 'ok' };
}
function realSetupLabel() {
  if (settings.provider === 'backend') return backendHealth.ready ? 'Ready for real scan' : 'Backend setup needed';
  return providerReady() ? 'Live setup needed' : 'Ready for real scan';
}
function ageLabel(ms) {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 60) return `Updated ${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `Updated ${min}m ago`;
  return `Updated ${Math.floor(min / 60)}h ago`;
}
function renderBookChips() {
  const html = BOOK_GROUPS.map(group => {
    const activeCount = group.keys.filter(key => selectedBooks.includes(key)).length;
    const chips = group.keys.map(key => {
      const book = bookByKey(key);
      const active = selectedBooks.includes(book.key);
      return `<button class="book-chip ${book.type === 'sharp' || book.type === 'exchange' ? 'sharp' : ''} ${active ? 'active' : ''}" data-book="${book.key}" aria-pressed="${active ? 'true' : 'false'}" title="${active ? 'Click to remove' : 'Click to add'}" type="button">${escapeHtml(book.name)}</button>`;
    }).join('');
    return `<details class="book-group" ${group.open ? 'open' : ''}><summary>${escapeHtml(group.label)} <span>${activeCount}/${group.keys.length}</span></summary><div class="book-group-body">${chips}</div></details>`;
  }).join('');
  $('ev_book_chips').className = 'book-groups';
  $('arb_book_chips').className = 'book-groups';
  $('ev_book_chips').innerHTML = html;
  $('arb_book_chips').innerHTML = html;
  document.querySelectorAll('[data-book-count]').forEach(el => {
    el.textContent = `${selectedBooks.length} selected`;
    el.className = `tag ${selectedBooks.length ? 'green' : 'amber'}`;
  });
  document.querySelectorAll('[data-book]').forEach(btn => btn.addEventListener('click', e => toggleBook(e.currentTarget.dataset.book, e)));
}
function toggleBook(key, event) {
  const selected = new Set(cleanBookKeys(selectedBooks, [key], true));
  const wasSelected = selected.has(key);
  if (wasSelected) selected.delete(key);
  else selected.add(key);
  selectedBooks = cleanBookKeys(Array.from(selected), DEFAULT_BOOKS, true);
  saveJson(STORE.selectedBooks, selectedBooks);
  renderBookChips();
  recomputeLoadedResults();
  renderResults();
  if (!selectedBooks.length) toast('No sportsbooks selected. Click any book to add it back.', 'warn');
}
function setBookGroup(action) {
  const byType = type => BOOKS.filter(book => book.type === type).map(book => book.key);
  const groups = {
    all: BOOKS.map(book => book.key),
    default: DEFAULT_BOOKS,
    soft: byType('soft'),
    sharp: SHARP_KEYS,
    dfs: byType('dfs'),
    exchange: byType('exchange'),
    clear: []
  };
  selectedBooks = cleanBookKeys(groups[action] || DEFAULT_BOOKS, DEFAULT_BOOKS, true);
  saveJson(STORE.selectedBooks, selectedBooks);
  renderBookChips();
  recomputeLoadedResults();
  renderResults();
  toast(selectedBooks.length ? `${selectedBooks.length} sportsbook${selectedBooks.length === 1 ? '' : 's'} selected.` : 'Sportsbook filter cleared.', selectedBooks.length ? 'ok' : 'warn');
}
function recomputeLoadedResults() {
  if (!loadedGames.length) return;
  evResults = computeEV(loadedGames, {
    mode: $('ev_mode')?.value || 'all',
    minEv: numberOr($('ev_min')?.value, 1) / 100,
    maxOdds: Math.abs(numberOr($('ev_max_odds')?.value, 500))
  });
  arbResults = computeArbs(loadedGames, {
    mode: $('arb_mode')?.value || 'all',
    minProfit: numberOr($('arb_min')?.value, 0) / 100,
    stake: numberOr($('arb_stake')?.value, 100)
  });
}
function renderFreeSources() {
  const html = FREE_SOURCES.map(s => `<div class="provider-card"><strong>${escapeHtml(s.name)}</strong><p>${escapeHtml(s.detail)}</p><p style="margin-top:8px;"><span class="tag blue">${escapeHtml(s.best)}</span></p><p style="margin-top:8px;"><a href="${s.url}" target="_blank" rel="noreferrer">Open source</a></p></div>`).join('');
  $('dash_free_stack').innerHTML = dashboardSetupCards();
  $('settings_sources').innerHTML = html;
}
function dashboardSetupCards() {
  const healthTone = settings.provider === 'demo' ? 'amber' : backendHealth.ready || settings.provider !== 'backend' && !providerReady() ? 'green' : 'amber';
  const feedText = settings.provider === 'backend'
    ? backendHealth.message
    : settings.provider === 'demo'
      ? 'Demo mode is active. Results are test data only.'
      : providerReady() || `${providerLabel()} key saved.`;
  return [
    ['Feed', providerLabel(), feedText, healthTone],
    ['Books', `${selectedBooks.length} selected`, selectedBooks.length ? 'Book filter is ready.' : 'Pick at least one sportsbook.', selectedBooks.length ? 'green' : 'amber'],
    ['Last scan', lastFetchAt ? ageLabel(Date.now() - lastFetchAt) : '--', loadedGames.length ? `${loadedGames.length} events loaded.` : 'No real feed loaded yet.', loadedGames.length ? 'blue' : 'amber'],
    ['Next step', settings.provider === 'backend' && !backendHealth.ready ? 'Start backend' : 'Run scan', settings.provider === 'backend' && !backendHealth.ready ? 'Open Settings and test backend.' : 'Use Scan EV or Scan Arbs.', 'blue']
  ].map(([label, value, detail, tone]) => `<div class="provider-card"><strong>${escapeHtml(label)}</strong><p><span class="tag ${tone}">${escapeHtml(value)}</span></p><p style="margin-top:8px;">${escapeHtml(detail)}</p></div>`).join('');
}

async function scanDemoOnLoad() {
  loadedGames = demoFeed();
  lastFetchAt = Date.now();
  lastCacheHit = false;
  lastError = '';
  evResults = computeEV(loadedGames, { mode: 'all', minEv: .01, maxOdds: 500 });
  arbResults = computeArbs(loadedGames, { mode: 'all', minProfit: 0, stake: 100 });
  renderAll();
}
async function bootInitialFeed() {
  if (settings.provider === 'demo') {
    await scanDemoOnLoad();
    return;
  }
  loadedGames = [];
  evResults = [];
  arbResults = [];
  renderRealSetup();
  renderAll();
  if (settings.provider === 'backend') await checkBackendHealth(true);
}
function renderRealSetup() {
  const message = settings.provider === 'backend'
    ? 'Real odds mode is selected. Start the backend cache server, then press Scan EV.'
    : 'Live provider mode is selected. Add/save your key, then press Scan EV.';
  const html = `<div class="empty"><div><strong>Real odds setup needed.</strong><br>${escapeHtml(message)}${setupChecklistHtml()}<div class="detail-actions" style="justify-content:center;"><button class="btn primary" data-jump="settings" type="button"><i data-lucide="settings"></i>Open Settings</button><button class="btn secondary" data-copy-start-command type="button"><i data-lucide="copy"></i>Copy Start Command</button><button class="btn secondary" data-demo-now type="button"><i data-lucide="play"></i>Use Demo Only</button></div></div></div>`;
  if ($('ev_results')) $('ev_results').innerHTML = html;
  if ($('arb_results')) $('arb_results').innerHTML = html;
}
async function checkBackendHealth(silent = false) {
  const endpoint = normalizeEndpoint(settings.backendEndpoint || 'http://localhost:8787');
  try {
    const resp = await fetch(`${endpoint}/api/health?ts=${Date.now()}`);
    if (!resp.ok) throw new Error(`Backend health HTTP ${resp.status}`);
    const data = await resp.json();
    backendHealth = {
      checked: true,
      ok: data.ok === true,
      ready: data.ready === true,
      message: data.ready
        ? `Backend ready: ${data.provider || 'provider'} cache ${data.cacheSeconds || '?'}s.`
        : `Backend is running, but no API key is set on the server.`
    };
    if (!silent) toast(backendHealth.message, data.ready ? 'ok' : 'warn');
  } catch (err) {
    backendHealth = { checked: true, ok: false, ready: false, message: `Backend offline at ${endpoint}. Start edge-cache-server.mjs first.` };
    if (!silent) toast(backendHealth.message, 'err');
  }
  renderStatus();
  return backendHealth;
}
async function refreshActive() {
  const active = document.querySelector('.panel.active')?.id || 'dashboard';
  if (active === 'arb') return scanArbs();
  if (active === 'odds') return loadBoardFeed();
  return scanEV();
}
async function scanEV() {
  const missing = providerReady();
  if (missing) { toast(missing, 'warn'); showTab('settings'); return; }
  if (!selectedBooks.length) { toast('Pick at least one sportsbook before scanning real odds.', 'warn'); return; }
  if (settings.provider === 'backend') {
    const health = await checkBackendHealth(true);
    if (!health.ready) {
      lastError = health.message;
      renderError('ev_results', health.message);
      toast(health.message, 'warn');
      showTab('settings');
      return;
    }
  }
  const button = $('ev_scan_btn');
  button.disabled = true;
  button.innerHTML = '<i data-lucide="loader"></i>Scanning';
  refreshIcons();
  try {
    lastError = '';
    lastCacheHit = false;
    loadedGames = await loadFeeds({ sport: $('ev_sport').value, market: $('ev_market').value });
    evResults = computeEV(loadedGames, {
      mode: $('ev_mode').value,
      minEv: numberOr($('ev_min').value, 1) / 100,
      maxOdds: Math.abs(numberOr($('ev_max_odds').value, 500))
    });
    renderAll();
    toast(`EV scan loaded ${evResults.length} edge${evResults.length === 1 ? '' : 's'}.`);
  } catch (e) {
    lastError = friendlyFetchError(e);
    renderError('ev_results', lastError);
    toast(lastError, 'err');
  } finally {
    button.disabled = false;
    button.innerHTML = '<i data-lucide="scan-line"></i>Scan EV';
    refreshIcons();
  }
}
async function scanArbs() {
  const missing = providerReady();
  if (missing) { toast(missing, 'warn'); showTab('settings'); return; }
  if (selectedBooks.length < 2) { toast('Pick at least two sportsbooks for arbitrage.', 'warn'); return; }
  if (settings.provider === 'backend') {
    const health = await checkBackendHealth(true);
    if (!health.ready) {
      lastError = health.message;
      renderError('arb_results', health.message);
      toast(health.message, 'warn');
      showTab('settings');
      return;
    }
  }
  const button = $('arb_scan_btn');
  button.disabled = true;
  button.innerHTML = '<i data-lucide="loader"></i>Scanning';
  refreshIcons();
  try {
    lastError = '';
    lastCacheHit = false;
    loadedGames = await loadFeeds({ sport: $('arb_sport').value, market: $('arb_market').value });
    arbResults = computeArbs(loadedGames, {
      mode: $('arb_mode').value,
      minProfit: numberOr($('arb_min').value, 0) / 100,
      stake: numberOr($('arb_stake').value, 100)
    });
    renderAll();
    toast(`Arb scan loaded ${arbResults.length} opportunit${arbResults.length === 1 ? 'y' : 'ies'}.`);
  } catch (e) {
    lastError = friendlyFetchError(e);
    renderError('arb_results', lastError);
    toast(lastError, 'err');
  } finally {
    button.disabled = false;
    button.innerHTML = '<i data-lucide="split"></i>Scan Arbs';
    refreshIcons();
  }
}
async function loadBoardFeed() {
  const missing = providerReady();
  if (missing) { toast(missing, 'warn'); showTab('settings'); return; }
  if (!selectedBooks.length) { toast('Pick at least one sportsbook first.', 'warn'); return; }
  lastError = '';
  lastCacheHit = false;
  loadedGames = await loadFeeds({ sport: $('ev_sport').value, market: $('ev_market').value });
  renderAll();
}
async function loadFeeds({ sport, market }) {
  if (settings.provider === 'demo') return demoFeed();
  const sports = activeSports(sport);
  const all = [];
  for (const sp of sports) {
    for (const mk of marketsFor(market, sp)) {
      const feed = await fetchMarket(sp, mk);
      feed.forEach(game => {
        game._sport = game._sport || sp;
        game._marketHint = game._marketHint || mk;
      });
      all.push(...feed);
    }
  }
  const byId = new Map();
  for (const game of all) {
    const id = game.id || `${game.home_team}_${game.away_team}_${game.commence_time}`;
    if (!byId.has(id)) byId.set(id, game);
    else mergeGameMarkets(byId.get(id), game);
  }
  renderStatus();
  return Array.from(byId.values());
}
function mergeGameMarkets(base, next) {
  const byBook = new Map((base.bookmakers || []).map(book => [book.key, book]));
  for (const book of next.bookmakers || []) {
    if (!byBook.has(book.key)) {
      (base.bookmakers || (base.bookmakers = [])).push(book);
      continue;
    }
    const existing = byBook.get(book.key);
    const marketKeys = new Set((existing.markets || []).map(m => m.key));
    for (const market of book.markets || []) {
      if (!marketKeys.has(market.key)) (existing.markets || (existing.markets = [])).push(market);
    }
  }
}
async function fetchMarket(sport, market) {
  const cacheKey = `${settings.provider}:${sport}:${market}:${selectedBooks.join(',')}`;
  const cached = feedCache[cacheKey];
  const cacheMs = (settings.cacheMinutes || 0) * 60000;
  if (cached && cacheMs > 0 && Date.now() - cached.at < cacheMs) {
    lastFetchAt = cached.at;
    lastCacheHit = true;
    return cached.data;
  }
  if (settings.provider === 'opticodds') {
    const opticData = await fetchOpticOddsMarket(sport, market);
    feedCache[cacheKey] = { at: Date.now(), data: opticData };
    lastFetchAt = feedCache[cacheKey].at;
    saveJson(STORE.cache, feedCache);
    return opticData;
  }
  const data = isPropMarket(market) ? await fetchEventMarket(sport, market) : await fetchSportMarket(sport, market);
  feedCache[cacheKey] = { at: Date.now(), data };
  lastFetchAt = feedCache[cacheKey].at;
  saveJson(STORE.cache, feedCache);
  return data;
}
async function fetchOpticOddsMarket(sport, market) {
  const config = OPTICODDS_LEAGUES[sport];
  if (!config) return [];
  const fixtures = await fetchOpticOddsFixtures(config);
  const fixtureIds = fixtures.map(fixture => fixture.id).filter(Boolean).slice(0, 24);
  if (!fixtureIds.length) return [];

  const all = [];
  const sportsbookChunks = chunk(selectedOpticOddsBooks(), 5);
  const fixtureChunks = chunk(fixtureIds, 8);
  for (const ids of fixtureChunks) {
    for (const books of sportsbookChunks) {
      const markets = opticOddsMarkets(sport, market);
      const data = await fetchOpticOddsSnapshot(ids, books, markets, sport);
      all.push(...data);
    }
  }
  return mergeGamesById(all);
}
async function fetchOpticOddsFixtures(config) {
  const params = new URLSearchParams({
    key: selectedProviderKeys().key,
    sport: config.sport,
    league: config.league
  });
  const resp = await fetch(`https://api.opticodds.com/api/v3/fixtures/active?${params}`);
  captureQuota(resp);
  if (!resp.ok) throw new Error(`OpticOdds fixtures HTTP ${resp.status}`);
  return unwrapFeed(await resp.json());
}
async function fetchOpticOddsSnapshot(fixtureIds, sportsbooks, markets, sport) {
  const params = new URLSearchParams({
    key: selectedProviderKeys().key,
    odds_format: 'AMERICAN',
    is_main: 'true'
  });
  fixtureIds.forEach(id => params.append('fixture_id', id));
  sportsbooks.forEach(book => params.append('sportsbook', book));
  markets.forEach(market => params.append('market', market));
  const resp = await fetch(`https://api.opticodds.com/api/v3/fixtures/odds?${params}`);
  captureQuota(resp);
  if (!resp.ok) throw new Error(`OpticOdds odds HTTP ${resp.status}`);
  return normalizeOpticOddsFeed(await resp.json(), sport);
}
async function fetchSportMarket(sport, market) {
  if (settings.provider === 'backend') return fetchBackendMarket(sport, market);
  if (settings.provider === 'custom') {
    const url = settings.customEndpoint
      .replaceAll('{sport}', encodeURIComponent(sport))
      .replaceAll('{market}', encodeURIComponent(market))
      .replaceAll('{bookmakers}', encodeURIComponent(selectedBookText()));
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Custom endpoint HTTP ${resp.status}`);
    return unwrapFeed(await resp.json());
  }
  const key = selectedProviderKeys().key;
  const params = new URLSearchParams({ apiKey: key, regions: 'us,us2,eu', markets: market, oddsFormat: 'american', bookmakers: selectedBookText() });
  const base = settings.provider === 'propline' ? 'https://api.prop-line.com/v1' : 'https://api.the-odds-api.com/v4';
  const resp = await fetch(`${base}/sports/${sport}/odds?${params}`);
  captureQuota(resp);
  if (!resp.ok) throw new Error(`${providerLabel()} HTTP ${resp.status}`);
  return unwrapFeed(await resp.json());
}
async function fetchEventMarket(sport, market) {
  if (settings.provider === 'backend') return fetchBackendMarket(sport, market);
  const key = selectedProviderKeys().key;
  const base = settings.provider === 'propline' ? 'https://api.prop-line.com/v1' : 'https://api.the-odds-api.com/v4';
  if (settings.provider === 'custom') return fetchSportMarket(sport, market);
  const eventsResp = await fetch(`${base}/sports/${sport}/events?${new URLSearchParams({ apiKey: key })}`);
  captureQuota(eventsResp);
  if (!eventsResp.ok) throw new Error(`${providerLabel()} events HTTP ${eventsResp.status}`);
  const events = unwrapFeed(await eventsResp.json()).slice(0, settings.maxPropEvents || 10);
  const out = [];
  for (const event of events) {
    const params = new URLSearchParams({ apiKey: key, regions: 'us,us2,eu', markets: market, oddsFormat: 'american', bookmakers: selectedBookText() });
    const resp = await fetch(`${base}/sports/${sport}/events/${event.id}/odds?${params}`);
    captureQuota(resp);
    if (resp.ok) {
      const game = await resp.json();
      if (game && Array.isArray(game.bookmakers) && game.bookmakers.length) out.push(game);
    }
  }
  return out;
}
async function fetchBackendMarket(sport, market) {
  const endpoint = normalizeEndpoint(settings.backendEndpoint || 'http://localhost:8787');
  const url = new URL(`${endpoint}/api/odds`);
  url.searchParams.set('sport', sport);
  url.searchParams.set('market', market);
  url.searchParams.set('bookmakers', selectedBookText());
  url.searchParams.set('oddsFormat', 'american');
  url.searchParams.set('regions', 'us,us2,eu');
  const resp = await fetch(url.toString());
  captureQuota(resp);
  if (!resp.ok) throw new Error(`Backend cache HTTP ${resp.status}`);
  const payload = await resp.json();
  if (payload.cached) lastCacheHit = true;
  if (payload.updatedAt) lastFetchAt = new Date(payload.updatedAt).getTime() || Date.now();
  return unwrapFeed(payload);
}
function selectedBookText() {
  return unique([...selectedBooks, ...SHARP_KEYS]).join(',');
}
function selectedOpticOddsBooks() {
  return unique([...selectedBooks, ...SHARP_KEYS])
    .map(key => OPTICODDS_BOOKS[key])
    .filter(Boolean);
}
function chunk(items, size) {
  const groups = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}
function mergeGamesById(games) {
  const byId = new Map();
  for (const game of games) {
    if (!game || !game.id) continue;
    if (!byId.has(game.id)) byId.set(game.id, game);
    else mergeGameMarkets(byId.get(game.id), game);
  }
  return Array.from(byId.values());
}
function opticOddsMarkets(sport, market) {
  const spread = sport === 'baseball_mlb' ? 'run_line' : sport === 'icehockey_nhl' ? 'puck_line' : 'point_spread';
  const total = sport === 'baseball_mlb' ? 'total_runs' : sport === 'icehockey_nhl' || sport === 'soccer_usa_mls' ? 'total_goals' : 'total_points';
  const map = {
    h2h: ['moneyline'],
    spreads: [spread],
    totals: [total]
  };
  if (map[market]) return map[market];
  if (isPropMarket(market)) return [market];
  return ['moneyline', spread, total];
}
function normalizeOpticOddsFeed(payload, sport) {
  return unwrapFeed(payload)
    .map(fixture => normalizeOpticOddsFixture(fixture, sport))
    .filter(game => game.bookmakers.length);
}
function normalizeOpticOddsFixture(fixture, sport) {
  const home = firstName(fixture.home_competitors) || fixture.home_team || fixture.home || 'Home';
  const away = firstName(fixture.away_competitors) || fixture.away_team || fixture.away || 'Away';
  const game = {
    id: fixture.id || fixture.fixture_id || `${away}_${home}_${fixture.start_date || fixture.commence_time || ''}`,
    _sport: sport,
    sport_key: sport,
    commence_time: fixture.start_date || fixture.commence_time || fixture.start_time,
    home_team: home,
    away_team: away,
    in_play: fixture.is_live === true || fixture.status === 'live',
    bookmakers: []
  };
  const books = new Map();
  for (const odd of fixture.odds || []) {
    const bookKey = opticOddsBookKey(odd.sportsbook || odd.sportsbook_name || odd.book || odd.bookmaker);
    const marketKey = opticOddsMarketKey(odd.market_id || odd.market || odd.market_name);
    if (!bookKey || !marketKey || odd.price == null) continue;
    if (!books.has(bookKey)) books.set(bookKey, { key: bookKey, title: bookByKey(bookKey).name, markets: [] });
    const book = books.get(bookKey);
    let market = book.markets.find(m => m.key === marketKey);
    if (!market) {
      market = { key: marketKey, outcomes: [] };
      book.markets.push(market);
    }
    const outcome = opticOddsOutcome(odd, marketKey, game);
    if (outcome) market.outcomes.push(outcome);
  }
  game.bookmakers = Array.from(books.values())
    .map(book => ({ ...book, markets: book.markets.filter(market => market.outcomes.length) }))
    .filter(book => book.markets.length);
  return game;
}
function firstName(list) {
  return Array.isArray(list) && list[0] ? list[0].name : '';
}
function opticOddsBookKey(value) {
  const raw = normalizeToken(value);
  if (!raw) return '';
  const found = BOOKS.find(book => normalizeToken(book.name) === raw || normalizeToken(OPTICODDS_BOOKS[book.key]) === raw);
  return found ? found.key : raw;
}
function opticOddsMarketKey(value) {
  const raw = normalizeToken(value);
  if (!raw) return '';
  if (raw.includes('moneyline')) return 'h2h';
  if (raw.includes('spread') || raw.includes('runline') || raw.includes('puckline')) return 'spreads';
  if (raw.includes('total')) return 'totals';
  const prop = PROP_MARKETS.find(key => normalizeToken(key) === raw || raw.includes(normalizeToken(key)));
  return prop || raw;
}
function opticOddsOutcome(odd, marketKey, game) {
  const price = Number(odd.price);
  if (!Number.isFinite(price)) return null;
  const rawName = String(odd.name || odd.selection || odd.selection_name || '').trim();
  const line = String(odd.selection_line || odd.side || '').toLowerCase();
  const point = odd.points == null ? odd.point : odd.points;
  if (marketKey === 'h2h') {
    return { name: opticTeamName(rawName, odd, game), price };
  }
  if (marketKey === 'spreads') {
    return { name: opticTeamName(rawName, odd, game), price, point: Number(point) };
  }
  const totalName = line.includes('under') || rawName.toLowerCase().includes('under') ? 'Under' : 'Over';
  if (marketKey === 'totals') {
    return { name: totalName, price, point: Number(point) };
  }
  return {
    name: totalName,
    description: odd.player_name || odd.player?.name || odd.selection || cleanOpticPlayerName(rawName),
    price,
    point: Number(point)
  };
}
function opticTeamName(rawName, odd, game) {
  const raw = String(odd.selection || odd.selection_name || rawName || '').trim();
  if (raw && normalizeToken(raw).includes(normalizeToken(game.home_team))) return game.home_team;
  if (raw && normalizeToken(raw).includes(normalizeToken(game.away_team))) return game.away_team;
  if (raw && raw.toLowerCase() !== 'over' && raw.toLowerCase() !== 'under') return raw.replace(/\s+[+-]?\d+(\.\d+)?$/, '');
  return game.home_team;
}
function cleanOpticPlayerName(value) {
  return String(value || 'Player').replace(/\b(over|under)\b/ig, '').replace(/[+-]?\d+(\.\d+)?/g, '').trim() || 'Player';
}
function normalizeToken(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function unwrapFeed(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.events)) return payload.events;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.odds)) return payload.odds;
  if (payload && Array.isArray(payload.bookmakers)) return [payload];
  return [];
}
function captureQuota(resp) {
  const remaining = resp.headers.get('x-requests-remaining') || resp.headers.get('x-ratelimit-remaining') || resp.headers.get('x-rate-limit-remaining');
  const used = resp.headers.get('x-requests-used') || resp.headers.get('x-ratelimit-used') || resp.headers.get('x-rate-limit-used');
  if (remaining != null) quota.remaining = remaining;
  if (used != null) quota.used = parseInt(used, 10) || 0;
  renderStatus();
}
function friendlyFetchError(error) {
  const msg = String(error?.message || error || 'Unknown error');
  if (msg.includes('401') || msg.includes('403')) return `${providerLabel()} rejected the key or account access. Check the key, plan, and allowed markets.`;
  if (msg.includes('429')) return `${providerLabel()} rate limit hit. Try backend cache mode, raise browser cache minutes, or wait for quota to reset.`;
  if (msg.includes('404')) return `${providerLabel()} could not find that sport/market. Props often require a different provider or event-level market.`;
  if (msg.toLowerCase().includes('failed to fetch')) return `The browser could not reach ${providerLabel()}. This is often CORS, internet, or a blocked endpoint. Backend cache mode usually fixes it.`;
  if (msg.includes('Backend cache')) return `${msg}. Start edge-cache-server.mjs or check the backend endpoint in Settings.`;
  return msg;
}

function computeEV(games, options) {
  const results = [];
  const selected = new Set(selectedBooks);
  for (const game of games.filter(g => timingMatch(g, options.mode))) {
    const sport = game._sport || inferSport(game);
    for (const book of game.bookmakers || []) {
      if (!selected.has(book.key)) continue;
      for (const market of book.markets || []) {
        const ref = findReferenceMarket(game.bookmakers || [], market.key, book.key);
        if (!ref) continue;
        const refOutcomes = ref.market.outcomes || [];
        const probs = refOutcomes.map(o => amToProb(o.price));
        if (probs.some(p => !Number.isFinite(p))) continue;
        const vig = (probs.reduce((s, p) => s + p, 0) - 1) * 100;
        if (vig < -2 || vig > 12) continue;
        const trueProbs = powerDevig(probs);
        for (const outcome of market.outcomes || []) {
          const idx = refOutcomes.findIndex(refOut => outcomesMatch(market.key, refOut, outcome));
          if (idx === -1) continue;
          const dec = amToDec(outcome.price);
          const prob = trueProbs[idx];
          if (!Number.isFinite(dec) || !Number.isFinite(prob)) continue;
          const ev = prob * dec - 1;
          if (ev < options.minEv) continue;
          if (Math.abs(Number(outcome.price)) > options.maxOdds && Number(outcome.price) > 0) continue;
          const formatted = formatOutcome(outcome, market.key);
          const stake = kellyStake(prob, outcome.price);
          const confidence = confidenceGrade({ ev, vig, refKey: ref.book.key, odds: outcome.price, live: isLiveGame(game) });
          results.push({
            key: `${game.id}:${market.key}:${formatted}:${book.key}`,
            gameId: game.id,
            sport,
            event: `${game.away_team || 'Away'} @ ${game.home_team || 'Home'}`,
            home: game.home_team || 'Home',
            away: game.away_team || 'Away',
            time: game.commence_time,
            live: isLiveGame(game),
            market: market.key,
            outcome: formatted,
            book: book.title || bookByKey(book.key).name,
            bookKey: book.key,
            odds: Number(outcome.price),
            fairOdds: decToAm(1 / prob),
            trueProb: prob,
            bookProb: amToProb(outcome.price),
            ev,
            vig,
            refBook: ref.book.title || bookByKey(ref.book.key).name,
            refKey: ref.book.key,
            refOdds: refOutcomes[idx].price,
            stake,
            confidence
          });
        }
      }
    }
  }
  return dedupeEV(results).sort((a, b) => b.ev - a.ev);
}
function findReferenceMarket(bookmakers, marketKey, excludeKey) {
  const order = unique([...SHARP_KEYS, ...bookmakers.map(b => b.key)]);
  const candidates = [];
  for (const key of order) {
    if (key === excludeKey) continue;
    const book = bookmakers.find(b => b.key === key);
    const market = book?.markets?.find(m => m.key === marketKey);
    if (!market || !market.outcomes?.length) continue;
    const probs = market.outcomes.map(o => amToProb(o.price));
    if (probs.some(p => !Number.isFinite(p))) continue;
    const vig = (probs.reduce((s, p) => s + p, 0) - 1) * 100;
    if (vig < -2 || vig > 14) continue;
    candidates.push({ book, market, vig });
  }
  if (!candidates.length) return null;
  const consensus = buildConsensusReference(candidates, marketKey);
  if (consensus) return consensus;
  return candidates.sort((a, b) => a.vig - b.vig)[0];
}
function buildConsensusReference(candidates, marketKey) {
  if (candidates.length < 2) return null;
  const sorted = candidates.sort((a, b) => (SHARP_KEYS.includes(b.book.key) ? 1 : 0) - (SHARP_KEYS.includes(a.book.key) ? 1 : 0) || a.vig - b.vig);
  const base = sorted[0].market;
  const consensusOutcomes = [];
  for (const baseOut of base.outcomes || []) {
    let weight = 0;
    let weightedProb = 0;
    for (const candidate of sorted) {
      const probs = candidate.market.outcomes.map(o => amToProb(o.price));
      const noVig = powerDevig(probs);
      const idx = candidate.market.outcomes.findIndex(out => outcomesMatch(marketKey, out, baseOut));
      if (idx === -1 || !Number.isFinite(noVig[idx])) continue;
      const w = SHARP_KEYS.includes(candidate.book.key) ? 2 : 1;
      weight += w;
      weightedProb += noVig[idx] * w;
    }
    if (!weight) return null;
    const avgProb = weightedProb / weight;
    consensusOutcomes.push({ ...baseOut, price: Number(decToAm(1 / avgProb)) });
  }
  if (consensusOutcomes.length !== (base.outcomes || []).length) return null;
  return {
    book: { key: 'consensus', title: `Consensus ${sorted.length}` },
    market: { key: marketKey, outcomes: consensusOutcomes },
    vig: 0
  };
}
function outcomesMatch(marketKey, a, b) {
  if (marketKey === 'h2h') return normalizeOutcomeName(a.name) === normalizeOutcomeName(b.name);
  return normalizeOutcomeName(a.name) === normalizeOutcomeName(b.name)
    && normalizeOutcomeName(a.description || '') === normalizeOutcomeName(b.description || '')
    && samePoint(a.point, b.point);
}
function formatOutcome(outcome, marketKey) {
  const base = outcome.description ? `${outcome.description} ${outcome.name}` : outcome.name;
  if (outcome.point == null) return base;
  const point = Number(outcome.point);
  return `${base} ${point > 0 ? '+' : ''}${point}`;
}
function dedupeEV(rows) {
  const best = new Map();
  for (const row of rows) if (!best.has(row.key) || row.ev > best.get(row.key).ev) best.set(row.key, row);
  return Array.from(best.values());
}
function confidenceGrade(row) {
  let score = 58;
  score += Math.min(22, Math.max(0, row.ev * 260));
  score += row.refKey === 'consensus' ? 12 : SHARP_KEYS.includes(row.refKey) ? 10 : 2;
  score += row.vig <= 4 ? 8 : row.vig <= 7 ? 4 : -5;
  score += row.live ? -6 : 3;
  score += Number(row.odds) > 350 ? -7 : 0;
  score = Math.max(1, Math.min(99, Math.round(score)));
  const label = score >= 82 ? 'A' : score >= 70 ? 'B' : score >= 58 ? 'C' : 'D';
  return { score, label };
}
function computeArbs(games, options) {
  const groups = new Map();
  const selected = new Set(selectedBooks);
  for (const game of games.filter(g => timingMatch(g, options.mode))) {
    const sport = game._sport || inferSport(game);
    for (const book of game.bookmakers || []) {
      if (!selected.has(book.key)) continue;
      for (const market of book.markets || []) {
        for (const out of market.outcomes || []) {
          const line = lineKey(market.key, out);
          const key = `${game.id}:${market.key}:${line}`;
          if (!groups.has(key)) groups.set(key, { key, game, sport, market: market.key, line, offers: new Map() });
          const group = groups.get(key);
          const outcome = outcomeKey(market.key, out);
          const dec = amToDec(out.price);
          if (!Number.isFinite(dec)) continue;
          const existing = group.offers.get(outcome);
          if (!existing || dec > existing.decimal) {
            group.offers.set(outcome, {
              outcome: formatOutcome(out, market.key),
              outcomeKey: outcome,
              book: book.title || bookByKey(book.key).name,
              bookKey: book.key,
              odds: Number(out.price),
              decimal: dec
            });
          }
        }
      }
    }
  }
  const arbs = [];
  for (const group of groups.values()) {
    const legs = Array.from(group.offers.values());
    if (legs.length < 2) continue;
    if (new Set(legs.map(leg => leg.bookKey)).size < 2) continue;
    if (group.market !== 'h2h' && legs.length !== 2) continue;
    const implied = legs.reduce((s, leg) => s + 1 / leg.decimal, 0);
    const profitRate = 1 / implied - 1;
    if (profitRate < options.minProfit) continue;
    const totalStake = Math.max(1, options.stake || 100);
    const payout = totalStake / implied;
    const sized = legs.map(leg => ({ ...leg, stake: +(payout / leg.decimal).toFixed(2), implied: 1 / leg.decimal }));
    arbs.push({
      key: group.key,
      sport: group.sport,
      event: `${group.game.away_team || 'Away'} @ ${group.game.home_team || 'Home'}`,
      time: group.game.commence_time,
      live: isLiveGame(group.game),
      market: group.market,
      line: group.line,
      implied,
      profitRate,
      totalStake,
      payout,
      profit: payout - totalStake,
      legs: sized
    });
  }
  return arbs.sort((a, b) => b.profitRate - a.profitRate);
}
function lineKey(marketKey, outcome) {
  if (marketKey === 'h2h') return 'game';
  return `${normalizeOutcomeName(outcome.description || '')}:${normalizedPoint(outcome.point)}`;
}
function outcomeKey(marketKey, outcome) {
  if (marketKey === 'h2h') return normalizeOutcomeName(outcome.name);
  return `${normalizeOutcomeName(outcome.description || '')}:${normalizedPoint(outcome.point)}:${normalizeOutcomeName(outcome.name)}`;
}
function timingMatch(game, mode) {
  if (mode === 'live') return isLiveGame(game);
  if (mode === 'prematch') return !isLiveGame(game);
  return true;
}
function inferSport(game) {
  const id = String(game.id || '');
  return SPORTS.find(s => id.includes(s[0]))?.[0] || 'baseball_mlb';
}

function renderAll() {
  renderStatus();
  renderResults();
  renderDashboard();
  renderOddsScreen();
  renderTracker();
  refreshIcons();
}
function renderResults() {
  renderEV();
  renderArbs();
  renderDashboard();
  renderOddsScreen();
  renderStatus();
}
function searchFilter(row) {
  const q = $('global_search').value.trim().toLowerCase();
  if (!q) return true;
  return JSON.stringify(row).toLowerCase().includes(q);
}
function confidenceFilter(row) {
  const min = $('ev_conf')?.value || 'all';
  if (min === 'all') return true;
  const floors = { A: 82, B: 70, C: 58 };
  return (row.confidence?.score || 0) >= (floors[min] || 0);
}
function windowFilter(row, value) {
  if (!value || value === 'all') return true;
  if (row.live) return true;
  const hours = Number(value);
  const time = new Date(row.time).getTime();
  if (!Number.isFinite(time)) return true;
  return time - Date.now() <= hours * 3600000;
}
function sortEVRows(a, b) {
  const sort = $('ev_sort')?.value || 'ev';
  const byTime = (new Date(a.time).getTime() || 0) - (new Date(b.time).getTime() || 0);
  if (sort === 'confidence') return (b.confidence?.score || 0) - (a.confidence?.score || 0) || b.ev - a.ev;
  if (sort === 'time') return byTime || b.ev - a.ev;
  if (sort === 'stake') return b.stake - a.stake || b.ev - a.ev;
  if (sort === 'odds') return amToDec(b.odds) - amToDec(a.odds) || b.ev - a.ev;
  if (sort === 'probability') return b.trueProb - a.trueProb || b.ev - a.ev;
  return b.ev - a.ev;
}
function sortArbRows(a, b) {
  const sort = $('arb_sort')?.value || 'profit';
  const byTime = (new Date(a.time).getTime() || 0) - (new Date(b.time).getTime() || 0);
  if (sort === 'cash') return b.profit - a.profit || b.profitRate - a.profitRate;
  if (sort === 'time') return byTime || b.profitRate - a.profitRate;
  if (sort === 'implied') return a.implied - b.implied;
  if (sort === 'legs') return a.legs.length - b.legs.length || b.profitRate - a.profitRate;
  return b.profitRate - a.profitRate;
}
function emptyReason(kind) {
  if (!selectedBooks.length) return 'No sportsbooks are selected. Click one sportsbook chip or use All/Core above.';
  if (lastError) return lastError;
  if (!loadedGames.length && settings.provider !== 'demo') return settings.provider === 'backend'
    ? 'Real odds mode is on. Start the backend cache server, test it in Settings, then run a scan.'
    : 'Live odds mode is on. Add/save your provider key, then run a scan.';
  if (!loadedGames.length) return 'No feed is loaded yet. Run a scan, or use Demo Only to test the board.';
  if (kind === 'arb') return 'No arbs passed the current sportsbook, timing, profit, and market filters. Arbs also require exact same line/player matching across books.';
  return 'No rows passed the sportsbook, timing, confidence, search, and EV filters. Try lowering Min EV or changing market.';
}
function noRowsHtml(kind, message = '') {
  const reason = message || emptyReason(kind);
  const title = kind === 'arb' ? 'No arbitrage results loaded.' : 'No EV results loaded.';
  const setupActions = !loadedGames.length && settings.provider !== 'demo'
    ? `${setupChecklistHtml()}<div class="detail-actions" style="justify-content:center;"><button class="btn primary" data-jump="settings" type="button"><i data-lucide="settings"></i>Open Settings</button><button class="btn secondary" data-copy-start-command type="button"><i data-lucide="copy"></i>Copy Start Command</button><button class="btn secondary" data-demo-now type="button"><i data-lucide="play"></i>Use Demo Only</button></div>`
    : '';
  return `<div class="empty"><div><strong>${escapeHtml(title)}</strong><br>${escapeHtml(reason)}${setupActions}</div></div>`;
}
function setupChecklistHtml() {
  const backend = settings.provider === 'backend';
  const steps = backend
    ? ['Start the backend server', 'Click Test Backend in Settings', 'Run Scan EV or Scan Arbs']
    : ['Save your live API key', 'Run a small scan first', 'Open results and verify prices'];
  return `<div class="setup-checklist">${steps.map((step, index) => `<div class="setup-step"><b>${index + 1}</b><span>${escapeHtml(step)}</span></div>`).join('')}</div>`;
}
function currentEVRows() {
  const selected = new Set(selectedBooks);
  return evResults
    .filter(row => selected.has(row.bookKey))
    .filter(searchFilter)
    .filter(confidenceFilter)
    .filter(row => windowFilter(row, $('ev_window')?.value || 'all'))
    .sort(sortEVRows);
}
function currentArbRows() {
  const selected = new Set(selectedBooks);
  return arbResults
    .filter(row => row.legs.every(leg => selected.has(leg.bookKey)))
    .filter(searchFilter)
    .filter(row => windowFilter(row, $('arb_window')?.value || 'all'))
    .sort(sortArbRows);
}
function renderEV() {
  const rows = currentEVRows();
  $('ev_export_btn').hidden = !rows.length;
  $('ev_clear_btn').hidden = !evResults.length;
  $('ev_loaded_tag').textContent = `${rows.length} result${rows.length === 1 ? '' : 's'}`;
  $('ev_nav_count').textContent = rows.length;
  if (!rows.length) {
    $('ev_results').innerHTML = noRowsHtml('ev');
    return;
  }
  $('ev_results').innerHTML = `<div class="table-card">
    <div class="table-head"><strong>Positive EV Board</strong><div class="table-meta"><span class="tag green">${rows.length} edges</span><span class="tag ${freshnessState().tone === 'warn' ? 'amber' : 'blue'}">${escapeHtml(freshnessState().label)}</span></div></div>
    <div class="table-scroll"><table><thead><tr><th>EV</th><th>Stake</th><th>Event</th><th>Bet</th><th>Book</th><th>Odds</th><th>No-vig</th><th>Width</th><th>Confidence</th><th>Actions</th></tr></thead>
    <tbody>${rows.map(evRow).join('')}</tbody></table></div><div id="ev_detail" class="details"></div></div>`;
}
function evRow(row) {
  const edgeClass = row.ev >= .06 ? 'hot' : row.ev >= .03 ? '' : 'med';
  return `<tr class="${selectedResultKey === row.key ? 'selected' : ''}" data-select-result="${escapeHtml(row.key)}">
    <td><span class="edge ${edgeClass}">${fmtPct(row.ev * 100)}</span></td>
    <td><strong>${money(row.stake)}</strong><div class="mini">q Kelly</div></td>
    <td class="event-cell"><strong>${escapeHtml(row.event)}</strong><span>${prettySport(row.sport)} · ${formatTime(row.time)} · ${row.live ? 'Live' : 'Pre'}</span></td>
    <td class="bet-cell"><strong>${escapeHtml(row.outcome)}</strong><span>${prettyMarket(row.market)}</span></td>
    <td><span class="book-badge">${escapeHtml(row.book)}</span></td>
    <td><div class="price">${fmtOdds(row.odds)}</div><div class="mini">${(row.bookProb * 100).toFixed(2)}% implied</div></td>
    <td><strong>${row.fairOdds}</strong><div class="mini">${escapeHtml(row.refBook)} ${fmtOdds(row.refOdds)}</div></td>
    <td>${row.vig.toFixed(2)}%</td>
    <td><span class="tag ${row.confidence.label === 'A' ? 'green' : row.confidence.label === 'B' ? 'blue' : 'amber'}" title="${escapeHtml(confidenceExplanation(row.confidence.label))}">${row.confidence.label} · ${row.confidence.score}<button class="confidence-help" data-confidence-help="${row.confidence.label}" type="button" aria-label="Explain confidence ${row.confidence.label}">?</button></span></td>
    <td><div class="row-actions"><button class="icon-btn" title="Copy" data-copy="${escapeHtml(encodeURIComponent(evText(row)))}"><i data-lucide="copy"></i></button><button class="icon-btn" title="Open book" data-open-book="${row.bookKey}"><i data-lucide="external-link"></i></button><button class="icon-btn" title="Track" data-track-ev="${escapeHtml(row.key)}"><i data-lucide="plus"></i></button></div></td>
  </tr>`;
}
function confidenceExplanation(label) {
  if (label === 'A') return 'A = stronger edge, cleaner market width, and sharp/consensus reference support.';
  if (label === 'B') return 'B = moderate market agreement with usable reference pricing.';
  if (label === 'C') return 'C = lower sample quality, wider market, or faster-moving price.';
  return 'D = fragile signal. Recheck the market carefully before acting.';
}
function renderArbs() {
  const rows = currentArbRows();
  $('arb_export_btn').hidden = !rows.length;
  $('arb_loaded_tag').textContent = `${rows.length} result${rows.length === 1 ? '' : 's'}`;
  $('arb_nav_count').textContent = rows.length;
  if (!rows.length) {
    const msg = selectedBooks.length < 2
      ? 'Pick at least two sportsbooks to show arbitrage, because every arb needs multiple books.'
      : emptyReason('arb');
    $('arb_results').innerHTML = noRowsHtml('arb', msg);
    return;
  }
  $('arb_results').innerHTML = `<div class="table-card">
    <div class="table-head"><strong>Arbitrage Board</strong><div class="table-meta"><span class="tag blue">${rows.length} arbs</span><span class="tag ${freshnessState().tone === 'warn' ? 'amber' : 'blue'}">${escapeHtml(freshnessState().label)}</span></div></div>
    <div class="table-scroll"><table><thead><tr><th>Profit</th><th>Stake</th><th>Event</th><th>Market</th><th>Legs</th><th>Payout</th><th>Actions</th></tr></thead>
    <tbody>${rows.map(arbRow).join('')}</tbody></table></div><div id="arb_detail" class="details"></div></div>`;
}
function arbRow(row) {
  return `<tr class="${selectedResultKey === row.key ? 'selected' : ''}" data-select-result="${escapeHtml(row.key)}">
    <td><span class="edge hot">${fmtPct(row.profitRate * 100)}</span><div class="mini">${signedMoney(row.profit)}</div></td>
    <td><strong>${money(row.totalStake)}</strong><div class="mini">total risk</div></td>
    <td class="event-cell"><strong>${escapeHtml(row.event)}</strong><span>${prettySport(row.sport)} · ${formatTime(row.time)} · ${row.live ? 'Live' : 'Pre'}</span></td>
    <td class="bet-cell"><strong>${prettyMarket(row.market)}</strong><span>${escapeHtml(row.line)}</span></td>
    <td>${row.legs.map(leg => `<div><span class="book-badge">${escapeHtml(leg.book)}</span> ${escapeHtml(leg.outcome)} <strong>${fmtOdds(leg.odds)}</strong> · ${money(leg.stake)}</div>`).join('')}</td>
    <td><strong>${money(row.payout)}</strong><div class="mini">implied ${(row.implied * 100).toFixed(2)}%</div></td>
    <td><div class="row-actions"><button class="icon-btn" title="Copy" data-copy="${escapeHtml(encodeURIComponent(arbText(row)))}"><i data-lucide="copy"></i></button><button class="icon-btn" title="Track" data-track-arb="${escapeHtml(row.key)}"><i data-lucide="plus"></i></button></div></td>
  </tr>`;
}
function renderDashboard() {
  const bestEv = evResults[0];
  const bestArb = arbResults[0];
  $('dash_best_ev').textContent = bestEv ? fmtPct(bestEv.ev * 100) : '--';
  $('dash_best_ev_sub').textContent = bestEv ? `${bestEv.book} · ${bestEv.outcome}` : 'scan to update';
  $('dash_best_arb').textContent = bestArb ? fmtPct(bestArb.profitRate * 100) : '--';
  $('dash_best_arb_sub').textContent = bestArb ? `${bestArb.legs.length} legs · ${signedMoney(bestArb.profit)}` : 'scan to update';
  const settled = bets.filter(b => b.status !== 'pending');
  const profit = settled.reduce((s, b) => s + (Number(b.profit) || 0), 0);
  $('dash_profit').textContent = signedMoney(profit);
  $('dash_profit').className = `value ${profit >= 0 ? 'pos' : 'neg'}`;
  $('dash_roi').textContent = `${bets.length} bet${bets.length === 1 ? '' : 's'} tracked`;
  const marketCount = countLoadedMarkets();
  const feedAgeSeconds = lastFetchAt ? Math.max(0, Math.round((Date.now() - lastFetchAt) / 1000)) : null;
  $('dash_last_scan').textContent = lastFetchAt ? ageLabel(Date.now() - lastFetchAt).replace('Updated ', '') : '--';
  $('dash_last_scan_sub').textContent = lastCacheHit ? 'from cache' : (lastFetchAt ? 'fresh request' : 'waiting');
  $('dash_markets').textContent = marketCount;
  $('dash_markets_sub').textContent = `${loadedGames.length} event${loadedGames.length === 1 ? '' : 's'} loaded`;
  $('dash_books').textContent = selectedBooks.length;
  $('dash_books_sub').textContent = selectedBooks.length ? 'sportsbooks selected' : 'none selected';
  $('dash_latency').textContent = feedAgeSeconds == null ? '--' : `${feedAgeSeconds}s`;
  $('dash_latency').className = `value ${feedAgeSeconds != null && feedAgeSeconds <= (settings.staleSeconds || 75) ? 'pos' : 'amber-text'}`;
  $('dash_latency_sub').textContent = freshnessState().label;
  const top = [...evResults.slice(0, 3), ...arbResults.slice(0, 2)];
  $('dash_opps_tag').textContent = `${top.length} loaded`;
  $('dashboard_opps').innerHTML = top.length ? top.map(item => {
    const isArb = item.legs;
    return `<div class="bet-row"><div><strong>${escapeHtml(item.event)}</strong><div class="mini">${isArb ? `Arb ${fmtPct(item.profitRate * 100)} · ${item.legs.length} legs` : `EV ${fmtPct(item.ev * 100)} · ${item.book}`}</div></div><span class="tag ${isArb ? 'blue' : 'green'}">${isArb ? signedMoney(item.profit) : item.confidence.label}</span><button class="icon-btn" data-jump="${isArb ? 'arb' : 'ev'}"><i data-lucide="arrow-right"></i></button></div>`;
  }).join('') : dashboardEmptyHtml();
  if ($('dash_free_stack')) $('dash_free_stack').innerHTML = dashboardSetupCards();
  renderTrackerStats();
}
function countLoadedMarkets() {
  const keys = [];
  for (const game of loadedGames || []) {
    for (const book of game.bookmakers || []) {
      for (const market of book.markets || []) keys.push(`${game.id}:${market.key}`);
    }
  }
  return unique(keys).length;
}
function dashboardEmptyHtml() {
  if (settings.provider !== 'demo' && !loadedGames.length) {
    return `<div class="empty" style="min-height:160px;box-shadow:none;"><div><strong>Real odds are not connected yet.</strong><br>${escapeHtml(emptyReason('ev'))}${setupChecklistHtml()}<div class="detail-actions" style="justify-content:center;"><button class="btn primary" data-jump="settings" type="button"><i data-lucide="settings"></i>Open Settings</button><button class="btn secondary" data-copy-start-command type="button"><i data-lucide="copy"></i>Copy Start Command</button><button class="btn secondary" data-demo-now type="button"><i data-lucide="play"></i>Use Demo Only</button></div></div></div>`;
  }
  return '<div class="empty" style="min-height:160px;box-shadow:none;">Run a scan to fill this board.</div>';
}
function renderOddsScreen() {
  const events = loadedGames.filter(g => visibleBookmakers(g).length);
  $('odds_event_count').textContent = events.length;
  if (!events.length) {
    $('odds_events').innerHTML = '<div class="empty" style="min-height:180px;box-shadow:none;">No events loaded.</div>';
    $('odds_matrix').innerHTML = '';
    return;
  }
  if (!selectedOddsEventId || !events.some(e => e.id === selectedOddsEventId)) selectedOddsEventId = events[0].id;
  $('odds_events').innerHTML = events.map(game => `<button class="event-button ${game.id === selectedOddsEventId ? 'active' : ''}" data-odds-event="${escapeHtml(game.id)}"><strong>${escapeHtml(game.away_team)} @ ${escapeHtml(game.home_team)}</strong><div class="mini">${prettySport(game._sport || inferSport(game))} · ${formatTime(game.commence_time)} · ${visibleBookmakers(game).length} selected books</div></button>`).join('');
  document.querySelectorAll('[data-odds-event]').forEach(btn => btn.addEventListener('click', () => { selectedOddsEventId = btn.dataset.oddsEvent; renderOddsScreen(); }));
  const game = events.find(e => e.id === selectedOddsEventId);
  $('odds_matrix_title').textContent = `${game.away_team} @ ${game.home_team}`;
  $('odds_matrix').innerHTML = oddsMatrix(game);
}
function oddsMatrix(game) {
  const markets = new Map();
  for (const book of visibleBookmakers(game)) for (const market of book.markets || []) {
    if (!markets.has(market.key)) markets.set(market.key, []);
    markets.get(market.key).push({ book, market });
  }
  return Array.from(markets.entries()).map(([key, rows]) => {
    const books = rows.map(r => r.book);
    const outcomes = unique(rows.flatMap(r => (r.market.outcomes || []).map(o => formatOutcome(o, key))));
    const cells = [`<div><strong>Outcome</strong></div>`, ...books.map(b => `<div><strong>${escapeHtml(b.title || bookByKey(b.key).name)}</strong></div>`)];
    for (const outcome of outcomes) {
      cells.push(`<div>${escapeHtml(outcome)}</div>`);
      const prices = books.map(book => {
        const market = rows.find(r => r.book.key === book.key)?.market;
        const out = (market?.outcomes || []).find(o => formatOutcome(o, key) === outcome);
        return out ? Number(out.price) : null;
      });
      const best = Math.max(...prices.filter(Number.isFinite).map(amToDec));
      prices.forEach(price => {
        const isBest = Number.isFinite(price) && amToDec(price) === best;
        cells.push(`<div class="${isBest ? 'best' : ''}">${Number.isFinite(price) ? fmtOdds(price) : '--'}</div>`);
      });
    }
    return `<div class="market-matrix"><h4>${prettyMarket(key)}</h4><div class="odds-grid" style="grid-template-columns:170px repeat(${books.length}, minmax(92px,1fr));">${cells.join('')}</div></div>`;
  }).join('');
}
function visibleBookmakers(game) {
  const selected = new Set(selectedBooks);
  if (!selected.size) return [];
  return (game.bookmakers || []).filter(book => selected.has(book.key));
}
function renderTracker() {
  renderTrackerStats();
  $('tracker_count').textContent = bets.length;
  if (!bets.length) {
    $('tracker_list').innerHTML = '<div class="empty" style="min-height:180px;box-shadow:none;">No tracked bets yet.</div>';
    return;
  }
  $('tracker_list').innerHTML = bets.map((bet, i) => `<div class="bet-row">
    <div><strong>${escapeHtml(bet.desc)}</strong><div class="mini">${escapeHtml(bet.book)} · ${fmtOdds(bet.odds)} · stake ${money(bet.stake)} · ${bet.status}</div></div>
    <span class="tag ${bet.status === 'win' ? 'green' : bet.status === 'loss' ? 'amber' : 'blue'}">${bet.status === 'pending' ? 'open' : signedMoney(bet.profit || 0)}</span>
    <div class="status-actions"><button class="icon-btn" data-settle="${i}:win" title="Win"><i data-lucide="check"></i></button><button class="icon-btn" data-settle="${i}:loss" title="Loss"><i data-lucide="x"></i></button><button class="icon-btn" data-settle="${i}:push" title="Push"><i data-lucide="minus"></i></button></div>
  </div>`).join('');
}
function renderTrackerStats() {
  const settled = bets.filter(b => b.status !== 'pending');
  const wins = settled.filter(b => b.status === 'win').length;
  const losses = settled.filter(b => b.status === 'loss').length;
  const pushes = settled.filter(b => b.status === 'push').length;
  const profit = settled.reduce((s, b) => s + (Number(b.profit) || 0), 0);
  const risk = settled.filter(b => b.status !== 'push').reduce((s, b) => s + (Number(b.stake) || 0), 0);
  $('track_record').textContent = `${wins}-${losses}-${pushes}`;
  $('track_profit').textContent = signedMoney(profit);
  $('track_profit').className = `value ${profit >= 0 ? 'pos' : 'neg'}`;
  $('track_roi').textContent = risk ? fmtPct(profit / risk * 100, 1) : '0%';
  const clvRows = bets.filter(b => Number.isFinite(b.closeOdds) && Number.isFinite(b.odds));
  $('track_clv').textContent = clvRows.length ? fmtPct(clvRows.reduce((s, b) => s + (amToProb(b.closeOdds) - amToProb(b.odds)) * -100, 0) / clvRows.length, 2) : '--';
}
function handleActions(e) {
  const bookAction = e.target.closest('[data-book-action]');
  if (bookAction) { setBookGroup(bookAction.dataset.bookAction); return; }
  const demoNow = e.target.closest('[data-demo-now]');
  if (demoNow) { switchToDemoMode(); return; }
  const copyStart = e.target.closest('[data-copy-start-command]');
  if (copyStart) { copyText(startBackendCommand()); return; }
  const confidenceHelp = e.target.closest('[data-confidence-help]');
  if (confidenceHelp) { toast(confidenceExplanation(confidenceHelp.dataset.confidenceHelp), 'ok'); return; }
  const quickScan = e.target.closest('[data-quick-scan]');
  if (quickScan) {
    const kind = quickScan.dataset.quickScan;
    showTab(kind === 'arb' ? 'arb' : 'ev');
    if (kind === 'arb') scanArbs();
    else scanEV();
    return;
  }
  const row = e.target.closest('[data-select-result]');
  if (row) { selectedResultKey = row.dataset.selectResult; renderSelectedDetails(); }
  const copy = e.target.closest('[data-copy]');
  if (copy) copyText(decodeURIComponent(copy.dataset.copy));
  const open = e.target.closest('[data-open-book]');
  if (open) openBook(open.dataset.openBook);
  const ev = e.target.closest('[data-track-ev]');
  if (ev) trackEV(ev.dataset.trackEv);
  const arb = e.target.closest('[data-track-arb]');
  if (arb) trackArb(arb.dataset.trackArb);
  const settle = e.target.closest('[data-settle]');
  if (settle) settleBet(settle.dataset.settle);
  const jump = e.target.closest('[data-jump]');
  if (jump) showTab(jump.dataset.jump);
}
function startBackendCommand() {
  return 'ODDS_PROVIDER=propline PROP_LINE_API_KEY="paste_your_key_here" node /Users/victor/Downloads/edge-cache-server.mjs';
}
function switchToDemoMode() {
  settings.provider = 'demo';
  saveSettings();
  hydrateSettings();
  quota = { used: 0, remaining: '?' };
  scanDemoOnLoad();
  toast('Demo mode loaded. This is test data, not real odds.', 'warn');
}
function renderSelectedDetails() {
  const ev = evResults.find(r => r.key === selectedResultKey);
  const arb = arbResults.find(r => r.key === selectedResultKey);
  renderEV();
  renderArbs();
  if (ev && $('ev_detail')) {
    $('ev_detail').classList.add('show');
    $('ev_detail').innerHTML = detailGrid([
      ['True probability', `${(ev.trueProb * 100).toFixed(2)}%`], ['Book implied', `${(ev.bookProb * 100).toFixed(2)}%`],
      ['Fair odds', ev.fairOdds], ['Reference book', ev.refBook], ['Market width', `${ev.vig.toFixed(2)}%`], ['Recommended stake', money(ev.stake)],
      ['Timing', ev.live ? 'Live' : 'Pre-match'], ['Source age', freshnessState().label], ['Confidence', `${ev.confidence.label} (${ev.confidence.score})`], ['Market', prettyMarket(ev.market)]
    ]) + `<div class="detail-actions"><button class="btn secondary" data-copy="${escapeHtml(encodeURIComponent(evText(ev)))}" type="button"><i data-lucide="copy"></i>Copy bet</button><button class="btn secondary" data-open-book="${ev.bookKey}" type="button"><i data-lucide="external-link"></i>Open book</button><button class="btn primary" data-track-ev="${escapeHtml(ev.key)}" type="button"><i data-lucide="plus"></i>Track</button></div>`;
  }
  if (arb && $('arb_detail')) {
    $('arb_detail').classList.add('show');
    $('arb_detail').innerHTML = detailGrid([
      ['Total implied', `${(arb.implied * 100).toFixed(2)}%`], ['Profit', signedMoney(arb.profit)], ['Payout', money(arb.payout)],
      ['Legs', String(arb.legs.length)], ['Market', prettyMarket(arb.market)], ['Timing', arb.live ? 'Live' : 'Pre-match'],
      ['Source age', freshnessState().label], ['Line', arb.line || 'game'], ['Books', unique(arb.legs.map(leg => leg.book)).join(', ')]
    ]) + `<div class="detail-actions"><button class="btn secondary" data-copy="${escapeHtml(encodeURIComponent(arbText(arb)))}" type="button"><i data-lucide="copy"></i>Copy arb</button><button class="btn primary" data-track-arb="${escapeHtml(arb.key)}" type="button"><i data-lucide="plus"></i>Track legs</button></div>`;
  }
  refreshIcons();
}
function detailGrid(items) {
  return `<div class="detail-grid">${items.map(([a, b]) => `<div class="detail-item"><span>${escapeHtml(a)}</span><strong>${escapeHtml(b)}</strong></div>`).join('')}</div>`;
}
function evText(row) {
  return `${row.book} | ${row.outcome} | ${fmtOdds(row.odds)} | stake ${money(row.stake)}\n${row.event}\n${prettySport(row.sport)} ${prettyMarket(row.market)} | ${formatTime(row.time)}\nEV ${fmtPct(row.ev * 100)} | true ${(row.trueProb * 100).toFixed(2)}% | fair ${row.fairOdds}`;
}
function arbText(row) {
  return `ARB ${row.event} | ${prettyMarket(row.market)} | profit ${fmtPct(row.profitRate * 100)} ${signedMoney(row.profit)}\n${row.legs.map(l => `${l.book} | ${l.outcome} | ${fmtOdds(l.odds)} | stake ${money(l.stake)}`).join('\n')}`;
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied.'); }
  catch { toast('Could not copy from this browser.', 'warn'); }
}
function openBook(key) {
  const url = bookByKey(key).url;
  if (!url) return toast('No direct book link saved for this book.', 'warn');
  window.open(url, '_blank', 'noopener,noreferrer');
}
function trackEV(key) {
  const row = evResults.find(r => r.key === key);
  if (!row) return;
  bets.unshift({ id: crypto.randomUUID(), desc: row.outcome + ' | ' + row.event, book: row.book, odds: row.odds, stake: row.stake || unitStake(), ev: row.ev * 100, status: 'pending', createdAt: new Date().toISOString(), closeOdds: row.refOdds });
  saveJson(STORE.bets, bets);
  renderTracker();
  renderDashboard();
  toast('Bet added to tracker.');
}
function trackArb(key) {
  const row = arbResults.find(r => r.key === key);
  if (!row) return;
  for (const leg of row.legs) bets.unshift({ id: crypto.randomUUID(), desc: `ARB ${leg.outcome} | ${row.event}`, book: leg.book, odds: leg.odds, stake: leg.stake, ev: row.profitRate * 100, status: 'pending', createdAt: new Date().toISOString() });
  saveJson(STORE.bets, bets);
  renderTracker();
  renderDashboard();
  toast('Arb legs added to tracker.');
}
function addManualBet() {
  const desc = $('manual_desc').value.trim();
  const book = $('manual_book').value.trim();
  const odds = numberOr($('manual_odds').value, NaN);
  const stake = numberOr($('manual_stake').value, NaN);
  if (!desc || !book || !Number.isFinite(odds) || !Number.isFinite(stake) || stake <= 0) return toast('Fill bet, book, odds, and stake.', 'warn');
  bets.unshift({ id: crypto.randomUUID(), desc, book, odds, stake, status: 'pending', createdAt: new Date().toISOString() });
  saveJson(STORE.bets, bets);
  renderTracker();
  toast('Manual bet added.');
}
function settleBet(payload) {
  const [idx, status] = payload.split(':');
  const bet = bets[Number(idx)];
  if (!bet) return;
  bet.status = status;
  const dec = amToDec(bet.odds);
  if (status === 'win') bet.profit = +(bet.stake * (dec - 1)).toFixed(2);
  else if (status === 'loss') bet.profit = -Math.abs(bet.stake);
  else bet.profit = 0;
  saveJson(STORE.bets, bets);
  renderTracker();
  renderDashboard();
}
function runCalc(kind) {
  if (kind === 'ev') {
    const odds = numberOr($('calc_ev_odds').value, 0), p = numberOr($('calc_ev_prob').value, 0) / 100;
    $('calc_ev_out').textContent = `EV ${fmtPct((p * amToDec(odds) - 1) * 100)} | fair ${decToAm(1 / p)}`;
  }
  if (kind === 'novig') {
    const a = amToProb(numberOr($('calc_nv_a').value, 0)), b = amToProb(numberOr($('calc_nv_b').value, 0)), sum = a + b;
    $('calc_nv_out').textContent = `A ${(a / sum * 100).toFixed(2)}% (${decToAm(sum / a)}) | B ${(b / sum * 100).toFixed(2)}% (${decToAm(sum / b)})`;
  }
  if (kind === 'arb') {
    const a = amToDec(numberOr($('calc_arb_a').value, 0)), b = amToDec(numberOr($('calc_arb_b').value, 0)), stake = numberOr($('calc_arb_stake').value, 100);
    const implied = 1 / a + 1 / b, payout = stake / implied;
    $('calc_arb_out').textContent = `Profit ${fmtPct((1 / implied - 1) * 100)} | stake A ${money(payout / a)} | stake B ${money(payout / b)} | win ${money(payout - stake)}`;
  }
  if (kind === 'kelly') {
    const br = numberOr($('calc_k_bankroll').value, 0), odds = numberOr($('calc_k_odds').value, 0), p = numberOr($('calc_k_prob').value, 0) / 100;
    const dec = amToDec(odds), b = dec - 1, full = ((b * p) - (1 - p)) / b;
    $('calc_k_out').textContent = `Full Kelly ${money(br * Math.max(0, full))} | quarter ${money(br * Math.max(0, full) * .25)}`;
  }
  if (kind === 'hedge') {
    const payout = numberOr($('calc_h_payout').value, 0), hedgeOdds = numberOr($('calc_h_odds').value, 0), stake = numberOr($('calc_h_stake').value, 0);
    const hedge = payout / amToDec(hedgeOdds);
    $('calc_h_out').textContent = `Hedge ${money(hedge)} | locked approx ${money(payout - hedge - stake)}`;
  }
  if (kind === 'freebet') {
    const fb = numberOr($('calc_fb_stake').value, 0), betOdds = numberOr($('calc_fb_odds').value, 0), hedgeOdds = numberOr($('calc_fb_hedge').value, 0);
    const winProfit = fb * (amToDec(betOdds) - 1), hedge = winProfit / amToDec(hedgeOdds);
    $('calc_fb_out').textContent = `Hedge ${money(hedge)} | conversion ${money(winProfit - hedge)} (${((winProfit - hedge) / fb * 100).toFixed(1)}%)`;
  }
}
function toggleWatch() {
  if (watchTimer) {
    clearInterval(watchTimer);
    watchTimer = null;
    $('watch_btn').innerHTML = '<i data-lucide="radar"></i>Watch';
    toast('Watch stopped.');
  } else {
    watchTimer = setInterval(refreshActive, Math.max(30, settings.refreshSeconds || 90) * 1000);
    $('watch_btn').innerHTML = '<i data-lucide="pause"></i>Watching';
    toast('Watch mode started.');
  }
  refreshIcons();
}
function exportJson(data, name) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
function exportCsv(rows, name) {
  if (!rows.length) return toast('Nothing to export.', 'warn');
  const cleanRows = rows.map(row => {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'object') continue;
      out[key] = value;
    }
    return out;
  });
  const headers = unique(cleanRows.flatMap(row => Object.keys(row)));
  const csv = [headers.join(','), ...cleanRows.map(row => headers.map(header => csvCell(row[header])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function flattenArbRow(row) {
  return {
    key: row.key,
    sport: row.sport,
    event: row.event,
    time: row.time,
    live: row.live,
    market: prettyMarket(row.market),
    line: row.line,
    profitRate: row.profitRate,
    profit: row.profit,
    totalStake: row.totalStake,
    payout: row.payout,
    legs: row.legs.map(leg => `${leg.book} ${leg.outcome} ${fmtOdds(leg.odds)} stake ${money(leg.stake)}`).join(' | ')
  };
}
function importAll(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.settings) settings = data.settings;
      if (Array.isArray(data.selectedBooks)) selectedBooks = cleanBookKeys(data.selectedBooks);
      if (Array.isArray(data.bets)) bets = data.bets;
      saveJson(STORE.settings, settings);
      saveJson(STORE.selectedBooks, selectedBooks);
      saveJson(STORE.bets, bets);
      hydrateSettings();
      renderBookChips();
      renderAll();
      toast('Backup imported.');
    } catch (err) { toast(`Import failed: ${err.message}`, 'err'); }
  };
  reader.readAsText(file);
}
function clearFeedCache() {
  feedCache = {};
  saveJson(STORE.cache, feedCache);
  lastCacheHit = false;
  toast('Feed cache cleared.');
  renderStatus();
}
function wipeLocal() {
  if (!confirm('Wipe local EdgeLab settings, cache, and tracker data?')) return;
  Object.values(STORE).forEach(key => localStorage.removeItem(key));
  location.reload();
}
function renderError(id, msg) {
  $(id).innerHTML = `<div class="empty"><div><strong>Could not load feed.</strong><br>${escapeHtml(msg)}</div></div>`;
}
function toast(message, tone = 'ok') {
  const el = $('toast');
  el.textContent = message;
  el.className = `toast show ${tone}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2800);
}

function demoFeed() {
  const now = Date.now();
  const games = [
    ['baseball_mlb','mlb1','New York Yankees','Boston Red Sox', 2, false],
    ['baseball_mlb','mlb2','Los Angeles Dodgers','San Diego Padres', 5, false],
    ['basketball_nba','nba1','Boston Celtics','New York Knicks', 9, false],
    ['basketball_wnba','wnba1','Las Vegas Aces','New York Liberty', -1, true],
    ['icehockey_nhl','nhl1','New York Rangers','New Jersey Devils', 3, false],
    ['soccer_usa_mls','mls1','Inter Miami','Atlanta United', -1, true],
    ['americanfootball_nfl','nfl1','Kansas City Chiefs','Buffalo Bills', 28, false]
  ];
  return games.map(([sport, id, away, home, hours, live], index) => makeDemoGame({ sport, id, away, home, commence: new Date(now + hours * 3600000).toISOString(), live, seed: index + 1 }));
}
function makeDemoGame({ sport, id, away, home, commence, live, seed }) {
  const markets = ['h2h','spreads','totals', ...(PROP_MARKETS_BY_SPORT[sport] || []).slice(0, 2)];
  const bookKeys = unique([...DEFAULT_BOOKS, 'betrivers', 'unibet', 'underdog', 'prizepicks', 'kalshi', 'polymarket', 'matchbook', 'smarkets']);
  const bookmakers = bookKeys.map((key, idx) => ({
    key,
    title: bookByKey(key).name,
    markets: markets.map(market => demoMarket(market, away, home, key, idx, seed, sport))
  }));
  return { id: `${sport}_${id}`, _sport: sport, sport_key: sport, commence_time: commence, home_team: home, away_team: away, in_play: live, bookmakers };
}
function demoMarket(market, away, home, bookKey, idx, seed, sport) {
  const drift = ((idx % 5) - 2) * 7 + seed;
  const outlier = (seed + idx) % 11 === 0 ? 42 : 0;
  if (market === 'h2h') {
    let a = -112 + drift, h = -104 - drift;
    if (bookKey === 'fanduel' && seed % 2) a += 50;
    if (bookKey === 'draftkings' && seed % 3 === 0) h += 55;
    if (bookKey === 'betmgm' && seed === 1) a = 135;
    return { key: market, outcomes: [{ name: away, price: Math.round(a + outlier) }, { name: home, price: Math.round(h - outlier / 2) }] };
  }
  if (market === 'spreads') {
    const point = seed % 2 ? -1.5 : 2.5;
    return { key: market, outcomes: [{ name: away, point, price: -108 + drift + outlier }, { name: home, point: -point, price: -108 - drift }] };
  }
  if (market === 'totals') {
    const point = sport.includes('basketball') ? 219.5 + seed : sport.includes('baseball') ? 8.5 : sport.includes('soccer') ? 2.5 : 5.5;
    return { key: market, outcomes: [{ name: 'Over', point, price: -106 + drift + outlier }, { name: 'Under', point, price: -110 - drift }] };
  }
  const player = demoPlayer(sport, seed);
  const point = market.includes('strikeouts') ? 5.5 : market.includes('outs') ? 17.5 : market.includes('rebounds') ? 7.5 : market.includes('assists') ? 5.5 : market.includes('shots') ? 2.5 : 21.5;
  return { key: market, outcomes: [{ name: 'Over', description: player, point, price: -105 + drift + outlier }, { name: 'Under', description: player, point, price: -115 - drift }] };
}
function demoPlayer(sport, seed) {
  const names = {
    baseball_mlb: ['Aaron Judge','Mookie Betts','Juan Soto','Zack Wheeler'],
    basketball_nba: ['Jayson Tatum','Jalen Brunson','Shai Gilgeous-Alexander'],
    basketball_wnba: ["A'ja Wilson",'Breanna Stewart','Sabrina Ionescu'],
    americanfootball_nfl: ['Patrick Mahomes','Josh Allen','Christian McCaffrey'],
    icehockey_nhl: ['Connor McDavid','Auston Matthews','Igor Shesterkin'],
    soccer_usa_mls: ['Lionel Messi','Thiago Almada','Denis Bouanga']
  };
  const list = names[sport] || ['Player'];
  return list[seed % list.length];
}

init();
