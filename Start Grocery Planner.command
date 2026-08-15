#!/bin/zsh
# Double-click this file to review the Grocery Planner locally.
# It serves the built app from ./grocery and opens your browser.
# Keep this Terminal window open while you're using it.

cd "$(dirname "$0")"
clear

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js isn't installed. Get it from https://nodejs.org and run this again."
  echo
  read "?Press return to close."
  exit 1
fi

PORT="${PORT:-5180}"

echo "Grocery Planner"
echo
echo "Opening http://localhost:$PORT"
echo "Keep this window open. Press Control-C to stop."
echo

# Give the server a moment to bind before the browser asks for the page.
( sleep 1; open "http://localhost:$PORT" ) &

PORT="$PORT" node grocery-planner/serve.mjs
