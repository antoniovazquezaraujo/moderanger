#!/usr/bin/env bash
#
# Start the Mode Ranger dev server with the project's Node 16 toolchain.
# Usage: ./scripts/dev.sh [ng serve options]
#
set -euo pipefail

cd "$(dirname "$0")/.."

# Angular 13 expects Node 16 (see CONTRIBUTING.md "Build and test").
NODE16_BIN="${NODE16_BIN:-$HOME/.nvm/versions/node/v16.20.2/bin}"
if [ -d "$NODE16_BIN" ]; then
  export PATH="$NODE16_BIN:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "error: node not found. Install Node 16 (e.g. 'nvm install 16') and retry." >&2
  exit 1
fi

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" != "16" ]; then
  echo "warning: Node $(node -v) is active; this project expects Node 16 (tests/build may fail)." >&2
fi

if [ ! -d node_modules ]; then
  echo "==> node_modules is missing: running 'npm ci' first (one-time, takes a while)..."
  npm ci
fi

echo "==> Starting the dev server on http://localhost:4200 (Ctrl+C to stop)"
exec npm start -- "$@"
