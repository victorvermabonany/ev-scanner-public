# EdgeLabs Odds Backend Cache

This optional local backend keeps API keys out of the public website and caches odds responses.

## Easiest Way

Double-click:

```text
/Users/victor/Downloads/Start EdgeLabs Real Odds.command
```

Paste your real API key when Terminal asks. Keep that Terminal window open.

## Start With The Odds API

```bash
ODDS_PROVIDER=oddsapi ODDS_API_KEY="paste_your_key_here" node /Users/victor/Downloads/edge-cache-server.mjs
```

## Start With PropLine

```bash
ODDS_PROVIDER=propline PROP_LINE_API_KEY="paste_your_key_here" node /Users/victor/Downloads/edge-cache-server.mjs
```

Then open EdgeLabs Odds, go to Settings, choose `Backend cache/proxy`, and keep the endpoint as:

```text
http://localhost:8787
```

Useful options:

```bash
CACHE_SECONDS=30 MAX_PROP_EVENTS=15 PORT=8787 ODDS_PROVIDER=propline PROP_LINE_API_KEY="paste_your_key_here" node /Users/victor/Downloads/edge-cache-server.mjs
```
