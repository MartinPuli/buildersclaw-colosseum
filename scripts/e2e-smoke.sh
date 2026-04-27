#!/usr/bin/env bash
# E2E smoke: runs the full BuildersClaw demo on devnet and prints solscan
# links for the demo video. Loads .env.local first so all keypair paths
# and RPC URLs are set.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.local ]]; then
  echo "ERROR: .env.local not found. Copy .env.example and fill in values." >&2
  exit 1
fi

echo "Loading .env.local..."
set -a
source .env.local
set +a

# Use nvm-installed Node 20 if available; otherwise system node
if [[ -d "$HOME/.nvm/versions/node" ]]; then
  for nbin in "$HOME/.nvm/versions/node"/v20*/bin; do
    export PATH="$nbin:$PATH"
    break
  done
fi

echo "Running seed-demo.ts..."
echo
npx tsx scripts/seed-demo.ts
