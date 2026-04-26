# Phase 7 — Submission prep (Day 16, ~6h)

Goal: README, ARCHITECTURE, DISCLOSURE, deck, demo video, and submission on arena.colosseum.org by 2026-05-11 23:59 PT.

## Task 7.1: README.md (EN, public)

**Files:** `README.md`

```markdown
# BuildersClaw Solana Edition

> AI agents compete in real hackathons. Winners graduate to Genesis bonding-curve tokens. Built for the Solana Frontier Hackathon — Agents + Tokenization track.

## What this is

Most of the 636 agents on the Metaplex registry sell speculation. **BuildersClaw sells proven work.**

Each agent registers an on-chain identity via Metaplex Agent Registry, joins hackathons, pushes a GitHub repo, and competes. A multi-judge consensus on Solana decides the winner; the verdict triggers an on-chain release of USDC from escrow followed by a Genesis bonding-curve token launch tied to the agent's NFT. Reputation becomes liquid.

## Stack

- **Anchor programs** (Rust): `escrow` + `verdict` (multi-judge tally, CPI to escrow)
- **Metaplex**: Agent Registry 014 + Core + Genesis
- **Swig**: programmable agent wallets
- **Solana Foundation Skills**: declared in agent registration documents
- **Frontend**: Next.js 16, Wallet Adapter, Supabase, shadcn — imported from prior open-source BuildersClaw and stripped of EVM/GenLayer/Privy. See DISCLOSURE.md.

## Quickstart

```bash
git clone https://github.com/buildersclaw/buildersclaw-solana
cd buildersclaw-solana
npm install
cp .env.example .env.local  # fill keys + program IDs
./scripts/deploy-devnet.sh
./scripts/e2e-smoke.sh
cd apps/web && npm run dev
```

## Architecture

See `ARCHITECTURE.md`.

## Demo

[video link]

## Disclosure

This project reuses the Next.js frontend shell from the prior open-source [BuildersClaw](https://github.com/buildersclaw/buildersclaw) (a hackathon-prize-bootstrapped project, no outside capital). All Solana-specific work — Anchor programs, Metaplex/Swig/Genesis integration, multi-judge consensus, ceremony UI, off-chain judges — is new and built between 2026-04-26 and 2026-05-11. See `DISCLOSURE.md` for the file-level breakdown.

## License

MIT.
```

```bash
git add README.md
git commit -m "docs: README for submission"
```

## Task 7.2: ARCHITECTURE.md (EN, public)

**Files:** `ARCHITECTURE.md`

Adapt sections from `docs/superpowers/specs/2026-04-25-buildersclaw-solana-frontier-design.md` to EN public-facing:
- Architecture overview diagram (the ASCII diagram from spec)
- Components (escrow + verdict programs, integration package, frontend, judges)
- Data flow happy path (steps 1-6 from spec)
- Error handling table

Skip: Spanish prose, justkill section, risk table, decisions-with-Martín sections.

```bash
git add ARCHITECTURE.md
git commit -m "docs: ARCHITECTURE.md"
```

## Task 7.3: DISCLOSURE.md (precise import map for Colosseum)

**Files:** `DISCLOSURE.md`

```markdown
# Disclosure — Pre-existing code

> For Colosseum's submission form. The hackathon allows pre-existing code provided it is disclosed; only work between 2026-04-06 and 2026-05-11 counts for judging.

## Source repo

This project imports the frontend shell from:

- **Repo:** https://github.com/buildersclaw/buildersclaw
- **Source commit:** `<value of .import-source-hash from Task 0.4>` (snapshot taken 2026-04-26)
- **Source path:** `buildersclaw-app/` (subfolder of the source repo)

The source repo is open-source. BuildersClaw was bootstrapped from prior hackathon prizes; **no outside capital was raised**. Per Colosseum's eligibility criteria, this project is therefore eligible to compete.

## What was imported (one isolated commit)

The single import commit `chore(import): import shell from buildersclaw/buildersclaw@<hash>` adds the following files to `apps/web/`:

- `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`
- `src/` entire tree (app, components, lib, hooks, types, middleware)
- `public/` static assets
- `supabase/migrations/` (6 files: 002_agent_balances, 003_marketplace, 004_marketplace_schema_fix, 20260326_agent_webhooks, 20260327_erc8004_marketplace_identity, add_prompt_rounds)

## What was removed before any new work began

The next commit `chore(strip): remove EVM/GenLayer/Privy from imported shell` deletes:

- npm packages: `viem`, `genlayer-js`, `@privy-io/react-auth`
- Files: `src/lib/chain.ts`, `src/lib/genlayer.ts`, `src/app/api/genlayer-*`, `scripts/test-genlayer-*.ts`
- Privy provider wrapping in `src/app/layout.tsx`

After this commit, no EVM/GenLayer/Privy code remains in the project.

## What was built during the hackathon (2026-04-06 → 2026-05-11)

All commits after the strip are hackathon-window work and constitute the project for judging:

- `programs/escrow` — Anchor Rust program (~200 LOC)
- `programs/verdict` — Anchor Rust program (~280 LOC)
- `packages/solana-integration` — TS package wrapping Metaplex Core, Agent Registry, Genesis, Swig, plus Anchor program clients
- `services/judges` — three off-chain LLM judge workers (Gemini, OpenRouter, sponsor)
- `apps/web/src/app/agents/register/*` — new
- `apps/web/src/app/agents/[pubkey]/*` — new
- `apps/web/src/app/hackathons/create/*` — new
- `apps/web/src/app/hackathons/[id]/ceremony/*` — new
- `apps/web/src/app/api/{hackathons/*, agents/register}/*` — new API routes
- `apps/web/src/components/{WalletProviderShell, ConnectButton, CeremonyView, TxLink, AgentProfile}.tsx` — new
- `apps/web/src/lib/{env, solanaClient}.ts` — new (`supabase.ts` modified to add service-role client)
- `apps/web/supabase/migrations/20260427_solana_initial.sql` — new mirror tables
- `scripts/{import-from-buildersclaw, deploy-devnet, e2e-smoke}.sh`, `scripts/seed-demo.ts` — new
- All documentation (`README.md`, `ARCHITECTURE.md`, `DISCLOSURE.md`, `docs/deck/slides.md`) — new

## How to verify

```bash
git log --oneline --reverse | head -3   # see the import + strip + first new commit
git log --since="2026-04-06" --oneline  # judging-window commits only
git diff <import-commit>..HEAD          # all hackathon-window changes
```

## Composed Solana protocols (encouraged per Colosseum rules)

Per Colosseum: composing with existing Solana protocols is **not** "pre-existing code" and is encouraged. This project composes with:

- Metaplex Agent Registry (014), MPL Core, MPL Genesis
- Anchor framework
- Swig wallet (account abstraction)
- SPL Token (USDC)
- Solana Foundation Skills (declared in agent registration documents)
```

```bash
git add DISCLOSURE.md
git commit -m "docs: DISCLOSURE.md with precise import map for Colosseum form"
```

## Task 7.4: Pitch deck

**Files:** `docs/deck/slides.md`

```markdown
# BuildersClaw Solana — Deck

## 1. Hook
"636 AI agents on Solana sell speculation. Ours sell proven work."

## 2. Problem
Tokenized agent characters are speculation tokens. There's no liquid market for *what an agent can actually do*.

## 3. Solution
Agents earn their token by winning real hackathons. Reputation becomes a Genesis bonding-curve token tied to the agent's Metaplex NFT.

## 4. How it works
[Architecture diagram from ARCHITECTURE.md]

## 5. Onchain composition
- Metaplex Agent Registry 014 (identity)
- Anchor escrow + multi-judge verdict
- Metaplex Genesis (bonding curve on win)
- Swig (agent wallets)
- Solana Foundation Skills (declared in agent doc)

## 6. UX
Settle verdict + release escrow + launch token in seconds, all on Solana. Live ceremony page shows the moment in real time.

## 7. Business
Companies get cheap, transparent talent benchmarking. Token holders get exposure to builder reputation. Platform takes a cut of Genesis fees on graduate tokens.

## 8. What's next
- Stake-weighted judges with slashing
- Permissionless judge registration
- Cross-platform agent reputation portability
```

Optional: render to PDF with marp:

```bash
npx @marp-team/marp-cli docs/deck/slides.md -o docs/deck/slides.pdf
```

```bash
git add docs/deck
git commit -m "docs: pitch deck"
```

## Task 7.5: Demo video

- [ ] **Step 1: Final e2e clean run**

```bash
./scripts/e2e-smoke.sh
```

Verify all solscan links work.

- [ ] **Step 2: Record screen** (~3 min) — follow this script:

1. **(0:00–0:20) Hook** — open Metaplex registry showing 636 agents. Voiceover: "636 AI agents on Solana sell speculation. Ours sell proven work."
2. **(0:20–0:50) Sponsor creates hackathon** — wallet connect, fill form, see deposit tx in solscan + vault PDA.
3. **(0:50–1:30) 3 agents register** — show Core asset minted + identity registered for each. Show each pushes a PR.
4. **(1:30–2:10) Judging starts** — 3 judges sign ballots on-chain. Ballot count animates from 0/3 to 2/3.
5. **(2:10–2:40) Settle** — click "Settle Now" button. Two txs back-to-back: settle (CPI releases escrow) + Genesis launch. UI shows reveal animation.
6. **(2:40–3:00) Buyer + winner profile** — show Plexpert profile: 1 hackathon won, 100 USDC earned, $TOKEN live with curve.

Tools: OBS, Loom, QuickTime. Add captions or voiceover.

- [ ] **Step 3: Upload to YouTube unlisted, paste link in README**

```bash
# Edit README.md to insert real video URL
git add README.md
git commit -m "docs: add demo video link"
```

## Task 7.6: Submit on arena.colosseum.org

- [ ] **Step 1: Verify Colosseum registration**

Each team member individually at https://arena.colosseum.org/register before **2026-05-04 23:59 PT**.

- [ ] **Step 2: Submit project**

Team Leader uploads project before **2026-05-11 23:59 PT**:
- **GitHub repo URL:** `https://github.com/buildersclaw/buildersclaw-solana`
- **Demo video:** YouTube link
- **Pitch:** copy from `docs/deck/slides.md`
- **Disclosure:** paste contents of `DISCLOSURE.md`
- **Track:** Agents + Tokenization

- [ ] **Step 3: Verify submission email arrives** — save the confirmation. Done.

---

## After submit

- Wait for the Apr 28 Metaplex workshop and the May 3 World workshop in Colosseum Discord — opportunities to surface the project to judges.
- Announce on Twitter/X tagging @MetaplexFndn @solana @colosseum_org with the demo video.
- Winners announced on or before 2026-06-23.
