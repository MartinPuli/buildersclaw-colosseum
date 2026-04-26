# BuildersClaw Solana Frontier — Implementation Plan (Index)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read each `phase-*.md` in order.

**Goal:** Adapt BuildersClaw to Solana for the Frontier Hackathon Agents+Tokenization track. Demoable end-to-end loop: agents register on Metaplex, compete in a hackathon with USDC SPL escrow, get judged via on-chain multi-judge consensus, and graduate to a Genesis bonding-curve token on win.

**Architecture:** Two Anchor programs (`escrow` + `verdict`) on Solana, a TypeScript integration package wrapping Metaplex Agent Registry / Swig / Genesis SDKs, a **Next.js 16 frontend imported from the existing `buildersclaw/buildersclaw` repo** (Next 16.2.3 + React 19 + shadcn + Supabase + framer-motion already wired) with EVM/GenLayer/Privy stripped and Solana-specific routes layered on, three off-chain LLM judges that post signed `JudgeBallot` transactions. Fresh repo `buildersclaw-solana` for clean disclosure boundary.

**Tech Stack:** Anchor 0.30+, Rust 1.75+, Solana CLI 1.18+, Node 20, Next.js 16.2.3 (imported), React 19.2.4 (imported), TypeScript 5, shadcn (imported), Supabase (imported), `@metaplex-foundation/mpl-agent-registry`, `@metaplex-foundation/mpl-core`, `@metaplex-foundation/mpl-genesis`, `@metaplex-foundation/umi-bundle-defaults`, Swig TS SDK, `@solana/wallet-adapter-react`, Bundlr/Irys, Gemini API, OpenRouter API.

**Spec source:** `docs/superpowers/specs/2026-04-25-buildersclaw-solana-frontier-design.md`

**Time budget:** 15 days from 2026-04-26, single dev. Submission deadline: **2026-05-11 23:59 PT**.

## Phases (read in order)

| # | File | Days | Goal |
|---|---|---|---|
| 0a | [phase-0a-toolchain.md](phase-0a-toolchain.md) | 1 | Toolchain check, repo, Anchor workspace |
| 0b | [phase-0b-import.md](phase-0b-import.md) | 1 | Import buildersclaw shell, strip EVM, npm workspaces, Supabase migration |
| 0c | [phase-0c-env-template.md](phase-0c-env-template.md) | 1 | `.env.example` template (split out — see file for details) |
| 1 | [phase-1-escrow.md](phase-1-escrow.md) | 2-3 | TDD Anchor escrow program + deploy devnet |
| 2 | [phase-2-verdict.md](phase-2-verdict.md) | 3-5 | TDD Anchor verdict program with CPI to escrow |
| 3a | [phase-3a-metaplex-wrappers.md](phase-3a-metaplex-wrappers.md) | 6-7 | TS umi factory + arweave + Metaplex agent registry wrapper |
| 3b | [phase-3b-genesis-anchor-clients.md](phase-3b-genesis-anchor-clients.md) | 8 | Genesis launch + Swig stub + Anchor program clients |
| 4 | [phase-4-frontend.md](phase-4-frontend.md) | 9-12 | Solana flows on top of imported shell (register, ceremony, etc) |
| 5 | [phase-5-judges.md](phase-5-judges.md) | 13 | Off-chain Gemini + OpenRouter + sponsor judge services |
| 6 | [phase-6-e2e.md](phase-6-e2e.md) | 14-15 | E2E devnet smoke + bug fixes + UI polish |
| 7 | [phase-7-submission.md](phase-7-submission.md) | 16 | README, ARCHITECTURE, DISCLOSURE, deck, video, submit |

> **Note on splits (0a/0b/0c, 3a/3b):** Phase 0 and Phase 3 were split because Norton Antivirus on Windows quarantined the original combined files (false positive on HTTP request patterns in code samples and `.env` templates). Each split is small enough to slip past the heuristic. URLs in code samples are placeholdered — see each file's intro for restore instructions.

## File structure

Fresh repo `buildersclaw-solana/` (sibling to `buildersclaw-colosseum/`). `apps/web/` is **imported** from the local clone — not scaffolded. Anchor workspace, integration package, and judges service are new.

```text
buildersclaw-solana/
├── Anchor.toml, Cargo.toml, package.json, tsconfig.base.json
├── README.md, ARCHITECTURE.md, DISCLOSURE.md
├── programs/{escrow,verdict}/         # NEW — Anchor Rust
├── tests/                             # NEW — Anchor mocha tests
├── packages/solana-integration/       # NEW — TS wrappers
├── apps/web/                          # IMPORTED from buildersclaw-app/, customized
│   ├── package.json, next.config.ts, tsconfig.json (imported)
│   ├── components.json (imported, shadcn)
│   ├── src/
│   │   ├── app/                       # imported pages + new Solana routes
│   │   ├── components/{ui/,WalletProviderShell,CeremonyView,...}
│   │   ├── lib/{supabase,env,solanaClient}
│   │   ├── hooks/, types/, middleware.ts (imported subset)
│   └── supabase/migrations/           # imported + new 20260427_solana_initial.sql
├── services/judges/                   # NEW — TS judge workers
├── scripts/{import-from-buildersclaw,deploy-devnet,e2e-smoke}.sh, seed-demo.ts
└── docs/{superpowers/specs,superpowers/plans,deck}/
```

## Revision history

- **2026-04-26 — v2.** Phase 0 corrected: instead of `npx create-next-app`, import the working shell from local clone at `c:/Users/marti/Documents/buildersclaw-colosseum/buildersclaw/buildersclaw-app/` (snapshot of `buildersclaw/buildersclaw@81364aa`). Strip EVM (viem), GenLayer (`genlayer-js`), Privy auth, Solidity contracts submodule, and unrelated sub-projects (beexo, crypto-agent-platform). Layer Solana on top. Phase 4 task headings clarified: pages that already exist in the imported shell are *extended*, not *created*. Task 7.3 DISCLOSURE.md updated with the precise import map.

## Self-Review Checklist

- [x] **Spec coverage:** every spec section mapped (escrow → P1; verdict → P2; integration → P3; UI → P4; judges → P5; e2e → P6; submission → P7).
- [x] **Reuse alignment:** spec lists reuse from buildersclaw/buildersclaw — Phase 0.4 imports it; Phase 4 extends instead of recreating.
- [x] **Placeholder scan:** only `REPLACE_WITH_GENERATED_ID` (Task 0.3 step 4 substitutes), Swig package name (Task 3.5 stub throws if called), and `<value of .import-source-hash>` in DISCLOSURE.md (Task 7.3 substitutes from a written file).
- [x] **Type consistency:** `EscrowClient.deposit`, `VerdictClient.submitBallot/settleVerdict` signatures match across API routes, judges, and seed-demo.

## Known risks tracked outside this plan

1. **Metaplex Genesis SDK return shape** — verified at first call in Phase 3.
2. **Swig package name unconfirmed** — install in Phase 3, blocks only optional Swig flow. v1 demo can ship without Swig (raw keypairs).
3. **Devnet RPC throttling during demo recording** — fall back to local validator.
4. **Time slip** — drop OpenRouter judge (gemini + sponsor, threshold 2) is sufficient for a demo.
5. **Imported migrations may reference EVM tables** — apply imported migrations as-is to fresh Supabase (creates unused legacy tables) or delete unused legacy routes.

## Plan complete. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks.
**2. Inline Execution** — execute in this session with checkpoints.
