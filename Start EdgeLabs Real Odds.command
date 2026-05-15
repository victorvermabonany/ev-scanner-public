#!/bin/zsh
cd "$(dirname "$0")"
clear
echo "EdgeLabs real odds backend"
echo
echo "Choose provider:"
echo "1) PropLine"
echo "2) The Odds API"
read "choice?Provider [1/2]: "

if [[ "$choice" == "1" ]]; then
  export ODDS_PROVIDER="propline"
  read "key?Paste your PropLine API key: "
  export PROP_LINE_API_KEY="$key"
else
  export ODDS_PROVIDER="oddsapi"
  read "key?Paste your The Odds API key: "
  export ODDS_API_KEY="$key"
fi

export PORT="${PORT:-8787}"
export CACHE_SECONDS="${CACHE_SECONDS:-45}"
export MAX_PROP_EVENTS="${MAX_PROP_EVENTS:-10}"

echo
echo "Starting backend on http://localhost:$PORT"
echo "Keep this Terminal window open while using real odds."
echo
node /Users/victor/Downloads/edge-cache-server.mjs
