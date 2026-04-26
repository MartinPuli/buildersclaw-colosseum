#!/usr/bin/env bash
# Imports the Next.js frontend shell from the local buildersclaw clone.
# This is run ONCE during Phase 0b setup. Source: buildersclaw/buildersclaw-app/
# Target: apps/web/
#
# Per Colosseum disclosure rules, this is a one-time import committed in a
# single isolated commit (chore(import): ...). All subsequent edits to the
# imported files are hackathon-window work.
set -euo pipefail

SRC="${1:-buildersclaw/buildersclaw-app}"
DST="apps/web"

if [[ ! -d "$SRC" ]]; then
  echo "ERROR: source not found: $SRC" >&2
  echo "Run this script from the repo root." >&2
  exit 1
fi

mkdir -p "$DST"

# Top-level config files
for f in package.json next.config.ts tsconfig.json postcss.config.mjs components.json eslint.config.mjs env.example .gitignore; do
  if [[ -f "$SRC/$f" ]]; then
    cp "$SRC/$f" "$DST/$f"
    echo "  copied: $f"
  fi
done

# Source tree (will strip EVM/GenLayer/Privy in Task 0.5)
if [[ -d "$SRC/src" ]]; then
  rm -rf "$DST/src"
  cp -r "$SRC/src" "$DST/src"
  echo "  copied: src/ ($(find "$DST/src" -type f | wc -l) files)"
fi

# Static assets
if [[ -d "$SRC/public" ]]; then
  rm -rf "$DST/public"
  cp -r "$SRC/public" "$DST/public"
  echo "  copied: public/ ($(find "$DST/public" -type f | wc -l) files)"
fi

# Supabase migrations (additive — we add 20260427_solana_initial.sql in Task 0.7)
if [[ -d "$SRC/supabase" ]]; then
  mkdir -p "$DST/supabase"
  rm -rf "$DST/supabase"
  cp -r "$SRC/supabase" "$DST/supabase"
  echo "  copied: supabase/ ($(find "$DST/supabase" -type f | wc -l) files)"
fi

echo
echo "Import complete from: $SRC"
echo "  -> $DST"
echo
echo "NOT imported (intentionally excluded):"
echo "  - genlayer/ (Python EVM smart contracts)"
echo "  - scripts/ (test runners for EVM/GenLayer flows)"
echo "  - docs/, AGENTS.md, CLAUDE.md, README.md (will be replaced)"
echo "  - vercel.json (regenerate per project)"
