// Client for the Chess.com public API.
// Docs: https://www.chess.com/news/view/published-data-api
//
// No API key or auth is needed, but the API returns 403 if you send no
// User-Agent, so every request here sets one.

const BASE_URL = 'https://api.chess.com/pub';
const USER_AGENT = 'ChessCoach/0.1 (personal learning project)';

class ChessComError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ChessComError';
    this.status = status;
  }
}

async function getJson(url) {
  let response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  } catch (cause) {
    throw new ChessComError(`Could not reach Chess.com (${url})`, 503);
  }

  if (response.status === 404) {
    throw new ChessComError('No such player on Chess.com', 404);
  }
  if (response.status === 429) {
    throw new ChessComError('Rate limited by Chess.com, try again shortly', 429);
  }
  if (!response.ok) {
    throw new ChessComError(
      `Chess.com returned ${response.status} for ${url}`,
      response.status
    );
  }

  return response.json();
}

/**
 * List the player's monthly archive URLs, oldest first.
 * e.g. https://api.chess.com/pub/player/hikaru/games/2026/08
 */
async function fetchArchiveUrls(username) {
  const url = `${BASE_URL}/player/${encodeURIComponent(username)}/games/archives`;
  const data = await getJson(url);
  return data.archives ?? [];
}

/**
 * Fetch a player's most recent games, newest first.
 *
 * Chess.com only exposes games one month at a time, and a month can hold
 * anywhere from zero to hundreds of games, so we walk archives backwards
 * from the newest until we have enough.
 *
 * Game objects are returned exactly as the API sends them.
 *
 * @param {string} username
 * @param {number} limit  how many games to return (default 20)
 * @returns {Promise<object[]>}
 */
export async function fetchRecentGames(username, limit = 20) {
  if (!username || !username.trim()) {
    throw new ChessComError('A username is required', 400);
  }

  const archiveUrls = await fetchArchiveUrls(username.trim());
  const collected = [];

  // Newest month first.
  for (const archiveUrl of [...archiveUrls].reverse()) {
    if (collected.length >= limit) break;

    const { games = [] } = await getJson(archiveUrl);
    // Games arrive oldest-first within a month; flip so newest leads.
    collected.push(...[...games].reverse());
  }

  return collected.slice(0, limit);
}

export { ChessComError };
