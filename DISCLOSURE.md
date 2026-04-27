# Disclosure — Pre-existing code

> For the Colosseum submission form. The hackathon allows pre-existing code provided it is disclosed; only work between **2026-04-06 and 2026-05-11** counts for judging.

## Source repo

This project imports the frontend shell from:

- **Repo:** https://github.com/buildersclaw/buildersclaw
- **Source commit:** `81364aa1d60a26d4273c74cd930e74c637702404` (snapshot taken 2026-04-26; recorded in `.import-source-hash`)
- **Source path:** `buildersclaw-app/` (subfolder of the source repo)

The source repo is open-source. **BuildersClaw was bootstrapped from prior hackathon prizes — no outside capital was raised.** Per Colosseum's eligibility criteria, this project is therefore eligible to compete.

## What was imported (one isolated commit)

The single import commit `chore(import): import frontend shell from buildersclaw/buildersclaw@81364aa1d60a26d4273c74cd930e74c637702404` (SHA `2fd3a22`) added 155 files to `apps/web/`:

- Top-level config: `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json` (shadcn), `env.example`
- `src/` entire tree (117 files): `app/`, `components/`, `hooks/`, `lib/`, `types/`, `middleware.ts`
- `public/` static assets (21 files)
- `supabase/migrations/` (6 files: 002_agent_balances, 003_marketplace, 004_marketplace_schema_fix, 20260326_agent_webhooks, 20260327_erc8004_marketplace_identity, add_prompt_rounds)

## What was removed before any new work began

The next commit `chore(strip): remove EVM/GenLayer/Privy from imported shell` (SHA `a93cded`) deleted ~2300 LOC of EVM-tied code:

**Whole-file deletes:**
- `src/lib/{chain,chain-config,chain-prerequisites,escrow-bytecode,erc8004,genlayer,public-chain}.ts`
- `src/types/privy.d.ts`, `src/hooks/useDeployEscrow.ts`
- `src/app/api/v1/chain/setup/`, `src/app/api/v1/hackathons/[id]/contract/`
- `src/app/enterprise/` (Privy-only route, 4 files)

**Surgical strip in 9 files** (auth.ts, hackathons.ts, judge.ts, validation.ts, page.tsx, agents/[name]/registration, agents/me, hackathons/[id]/join, hackathons/route.ts, marketplace/route.ts):
- erc8004 identity+reputation calls replaced by local stubs reading off the agent row directly
- `viem` `isAddress`/`getAddress`/`formatUnits` → hex regex / hardcoded helpers
- GenLayer judge funcs → no-op stubs returning `false` (Phase 5 deletes)
- USDC symbol/decimals helpers → env-driven defaults

**Stub-501 in 4 routes** (admin/hackathons/[id]/finalize, agents/identity, balance, proposals): inherently EVM-only flows, return 501 with a `// SOLANA-PORT:` comment until the Solana equivalent ships.

**Removed npm deps:** `viem`, `genlayer-js`, `@privy-io/react-auth`.
**Removed npm scripts:** all `test:genlayer-*` (6), `test:marketplace-flow`, `test:onchain-prize-flow`, `test:full-e2e`.

After this commit no source file references the deleted modules. Verify:
```bash
grep -rln "viem\|genlayer-js\|@privy-io" apps/web/src/  # → empty
grep -rln "escrow-bytecode\|chain-prerequisites\|chain-config\|public-chain\|privy\.d" apps/web/src/  # → empty
```

## What was built during the hackathon (2026-04-26 → 2026-05-11)

All commits after `chore(strip)` constitute the project for judging. As of 2026-04-26 (this writing):

**Anchor on-chain programs** (`programs/`):
- `escrow` — Anchor Rust, ~200 LOC: `PrizeVault` PDA + `deposit`/`release_to`/`refund_to`.
- `verdict` — Anchor Rust, ~280 LOC: `HackathonAccount` + `JudgeBallot` + `init_hackathon`/`submit_ballot`/`settle_verdict` (CPI to escrow with PDA-signed `release_to`)/`mark_refundable`.

**TS integration package** (`packages/solana-integration/`):
- `umi.ts`, `arweave.ts`, `agentRegistry.ts` (Metaplex + Bundlr).
- `escrow.ts` `EscrowClient`, `verdictClient.ts` `VerdictClient` (Anchor program clients).
- IDLs + types copied from `target/idl/`.

**Frontend Solana flows** (`apps/web/src/`):
- `components/solana/{WalletProviderShell,ConnectButton,TxLink,CeremonyView}.tsx`
- `app/agents/register/page.tsx`, `app/agents/[pubkey]/page.tsx`
- `app/hackathons/[id]/ceremony/page.tsx`
- `app/api/v1/solana/agents/register/route.ts`
- `app/api/v1/solana/hackathons/{create,[id]/{ballots,settle,submit,judge}}/route.ts`
- `lib/solana-env.ts`

**Off-chain workers** (`services/judges/`):
- `shared/{rubric,fetchRepo,poll}.ts`
- `gemini-judge.ts`, `openrouter-judge.ts`

**Tests** (`tests/`):
- `escrow.spec.ts` — 5/5 passing on devnet
- `verdict.spec.ts` — 4 tests (deposit/2 ballots/settle/refund), validation pending program data account extension

**Workspace** (root):
- `Anchor.toml`, `Cargo.toml`, `package.json` (npm workspaces), `tsconfig.base.json`, `tsconfig.json`
- `apps/web/supabase/migrations/20260427_solana_initial.sql` — Solana mirror tables
- `.env.example`
- Documentation: `README.md`, `ARCHITECTURE.md`, `DISCLOSURE.md`, `docs/deck/slides.md`

## How to verify the boundary

```bash
# All commits before chore(strip) are pre-existing or research/notes
git log --oneline --reverse

# All commits since chore(strip) are hackathon-window work
git log --since="2026-04-06" --oneline
git diff a93cded..HEAD --stat

# .import-source-hash records the exact buildersclaw commit imported
cat .import-source-hash
# 81364aa1d60a26d4273c74cd930e74c637702404
```

## Composed Solana protocols (encouraged per Colosseum rules)

Per Colosseum: composing with existing Solana protocols is **not** "pre-existing code" and is **encouraged**. This project composes with:

- Metaplex Agent Registry (014) + MPL Core
- Anchor framework 1.0.1
- SPL Token (USDC)
- Solana Wallet Adapter (Phantom + Backpack)
- Bundlr / Irys for Arweave permanent storage
