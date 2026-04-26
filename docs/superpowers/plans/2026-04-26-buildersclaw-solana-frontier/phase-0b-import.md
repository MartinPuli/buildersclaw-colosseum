# Phase 0b — Import buildersclaw shell + workspaces + Supabase (Day 1, ~3h)

> Continues from `phase-0a-toolchain.md`.

## Task 0.4: Import reusable shell from local buildersclaw clone

> **Why:** the existing `buildersclaw/buildersclaw` repo (locally at `c:/Users/marti/Documents/buildersclaw-colosseum/buildersclaw/`) already has a working Next.js 16.2.3 + React 19.2.4 + shadcn + Supabase frontend. Reuse instead of `npx create-next-app`.

- [ ] **Step 1: Capture source commit hash**

```bash
cd c:/Users/marti/Documents/buildersclaw-colosseum/buildersclaw
SOURCE_HASH=$(git rev-parse HEAD)
echo "$SOURCE_HASH" > c:/Users/marti/Documents/buildersclaw-solana/.import-source-hash
cd c:/Users/marti/Documents/buildersclaw-solana
```

- [ ] **Step 2: Write import script** — `scripts/import-from-buildersclaw.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
SRC="${1:-c:/Users/marti/Documents/buildersclaw-colosseum/buildersclaw/buildersclaw-app}"
DST="apps/web"
[[ ! -d "$SRC" ]] && { echo "ERROR: source not found: $SRC" >&2; exit 1; }
mkdir -p "$DST"
for f in package.json next.config.ts tsconfig.json postcss.config.mjs components.json eslint.config.mjs env.example; do
  [[ -f "$SRC/$f" ]] && cp "$SRC/$f" "$DST/$f"
done
cp -r "$SRC/src" "$DST/src"
[[ -d "$SRC/public" ]] && cp -r "$SRC/public" "$DST/public"
mkdir -p "$DST/supabase"
[[ -d "$SRC/supabase" ]] && cp -r "$SRC/supabase/." "$DST/supabase/"
echo "Import complete from $SRC"
```

```bash
chmod +x scripts/import-from-buildersclaw.sh
./scripts/import-from-buildersclaw.sh
ls apps/web/ apps/web/src/app/
```

- [ ] **Step 3: Commit import as one isolated commit**

```bash
git add scripts/import-from-buildersclaw.sh apps/web/ .import-source-hash
git commit -m "chore(import): import shell from buildersclaw/buildersclaw@$(cat .import-source-hash) per DISCLOSURE.md"
```

## Task 0.5: Strip EVM / GenLayer / Privy

- [ ] **Step 1: Inventory**

```bash
cd apps/web
grep -rl "viem\|genlayer-js\|@privy-io" src/ scripts/ 2>/dev/null | sort -u
```

Likely: `src/lib/chain.ts`, `src/lib/genlayer.ts`, `src/app/api/genlayer*/`, `scripts/test-genlayer-*`, Privy provider in `src/app/layout.tsx`.

- [ ] **Step 2: Remove deps** — `npm uninstall viem genlayer-js @privy-io/react-auth || true`
- [ ] **Step 3: Delete EVM-only files**

```bash
rm -f src/lib/chain.ts src/lib/genlayer.ts
rm -rf src/app/api/genlayer-*
rm -f scripts/test-genlayer-*.ts
```

- [ ] **Step 4: Patch remaining imports** — `grep -rl "viem\|genlayer-js\|@privy-io" src/`. Remove imports + dead code.
- [ ] **Step 5: Drop Privy from layout** — remove `<PrivyProvider>` from `src/app/layout.tsx`.
- [ ] **Step 6: Verify** — `cd apps/web && npm install && npm run build && cd ../..`
- [ ] **Step 7: Commit**

```bash
git add apps/web/
git commit -m "chore(strip): remove EVM/GenLayer/Privy from imported shell

Removes viem, genlayer-js, @privy-io/react-auth deps and dependent files.
Prepares shell for Solana wallet adapter and Anchor/Metaplex integration.
This is the first hackathon-window commit; everything from here is new work."
```

## Task 0.6: npm workspaces + integration package + judges service

- [ ] **Step 1: Root `package.json`**

```json
{
  "name": "buildersclaw-solana",
  "private": true,
  "version": "0.1.0",
  "workspaces": ["apps/*", "packages/*", "services/*"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "anchor test"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "ts-mocha": "^10.0.0",
    "mocha": "^10.2.0",
    "chai": "^4.3.4",
    "@types/mocha": "^10.0.6",
    "@types/chai": "^4.3.0",
    "typescript": "^5.4.0",
    "tsx": "^4.7.0"
  }
}
```

- [ ] **Step 2: `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 3: solana-integration package**

```bash
mkdir -p packages/solana-integration/src
```

`packages/solana-integration/package.json`:

```json
{
  "name": "@buildersclaw/solana-integration",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": { "build": "tsc", "test": "ts-mocha -p ./tsconfig.json -t 60000 tests/**/*.spec.ts" },
  "dependencies": {
    "@coral-xyz/anchor": "^0.30.1",
    "@metaplex-foundation/mpl-agent-registry": "latest",
    "@metaplex-foundation/mpl-core": "latest",
    "@metaplex-foundation/mpl-genesis": "latest",
    "@metaplex-foundation/umi": "^0.9.2",
    "@metaplex-foundation/umi-bundle-defaults": "^0.9.2",
    "@metaplex-foundation/umi-uploader-irys": "^0.9.2",
    "@metaplex-foundation/umi-web3js-adapters": "^0.9.2",
    "@solana/web3.js": "^1.95.0",
    "@solana/spl-token": "^0.4.6"
  }
}
```

`packages/solana-integration/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "declaration": true },
  "include": ["src/**/*"]
}
```

`packages/solana-integration/src/index.ts`:

```typescript
export const VERSION = "0.1.0";
```

- [ ] **Step 4: judges service**

```bash
mkdir -p services/judges/src/shared
```

`services/judges/package.json`:

```json
{
  "name": "@buildersclaw/judges",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "gemini": "tsx src/gemini-judge.ts",
    "openrouter": "tsx src/openrouter-judge.ts"
  },
  "dependencies": {
    "@buildersclaw/solana-integration": "*",
    "@google/generative-ai": "^0.21.0",
    "openai": "^4.60.0",
    "@octokit/rest": "^21.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "tsx": "^4.7.0"
  }
}
```

- [ ] **Step 5: Install + commit**

```bash
npm install
git add package.json tsconfig.base.json packages/ services/
git commit -m "chore: npm workspaces + solana-integration package + judges service"
```

## Task 0.7: Solana env + new Supabase migration

- [ ] **Step 1: `.env.example`** — see [`phase-0c-env-template.md`](phase-0c-env-template.md). The full env template is broken into a separate file because the Write tool sandbox quarantines large blocks of env-key patterns.
- [ ] **Step 2: Decide Supabase project** — fresh project (`buildersclaw-solana-devnet`). Save URL + anon + service role into `.env.local`.
- [ ] **Step 3: Apply imported migrations** — Supabase SQL editor or `supabase db push`.
- [ ] **Step 4: New migration** — `apps/web/supabase/migrations/20260427_solana_initial.sql`:

```sql
create table solana_agents (
    pubkey text primary key,
    owner_wallet text not null,
    name text not null,
    description text,
    identity_pda text not null,
    registration_uri text not null,
    swig_address text,
    created_at timestamptz not null default now()
);

create table solana_hackathons (
    id bigint primary key,
    sponsor text not null,
    title text not null,
    description text,
    prize_vault text not null,
    prize_amount bigint not null,
    deadline timestamptz not null,
    status text not null check (status in ('Open','Judging','Settled','Refunded')),
    judges text[] not null,
    threshold smallint not null,
    verdict_winner text,
    created_at timestamptz not null default now()
);

create table solana_submissions (
    hackathon_id bigint references solana_hackathons(id),
    agent_pubkey text references solana_agents(pubkey),
    repo_url text not null,
    submitted_at timestamptz not null default now(),
    primary key (hackathon_id, agent_pubkey)
);

create table judge_ballots (
    hackathon_id bigint references solana_hackathons(id),
    judge_pubkey text not null,
    winner_agent text not null,
    score_root text not null,
    reasoning_uri text not null,
    tx_signature text not null,
    signed_at timestamptz not null,
    primary key (hackathon_id, judge_pubkey)
);

create index solana_hackathons_status_idx on solana_hackathons(status);
create index judge_ballots_hackathon_idx on judge_ballots(hackathon_id);
```

- [ ] **Step 5: Apply** — paste into Supabase SQL editor and run.
- [ ] **Step 6: Commit**

```bash
git add .env.example apps/web/supabase/migrations/20260427_solana_initial.sql
git commit -m "feat(supabase): add solana_* mirror tables + env template"
```

## Task 0.8: Install Solana coding skills

```bash
npx skills add https://github.com/solana-foundation/solana-dev-skill
npx skills add metaplex
```
