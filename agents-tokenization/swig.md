# Swig — Programmable Smart Wallets on Solana

**Role in the stack:** wallet layer. Replaces a raw keypair with a policy-controlled wallet ideal for agent runtimes.

## What it is

An account-abstraction toolkit for Solana: on-chain accounts that perform standard wallet functions while adding programmable capabilities. Closes the AA gap Solana had vs. Ethereum.

## Why it matters for agents

- **Session-based authorization** — temporary scoped access without per-tx approval prompts
- **Granular role-based permissions** — not all-or-nothing wallet control; restrict by transaction type
- **Automated execution** — subscriptions, payment streaming, conditional workflows
- **Paymaster** — central account covers gas
- **Multi-auth** — keypair, ZK social logins (Google/X/Facebook), custom authority modules
- **Chain abstraction** — one wallet across SVM chains
- Roadmap: "AI-native transaction flows" called out explicitly

## Core primitives

A Swig wallet is a role-based system. Each role has:
- **Authority mechanism** (social, keypair, custom)
- **Configurable permissions** (what ops it can perform)
- **Optional session layer** (time-bounded, scoped grants)

## SDKs

| SDK | Compatibility | Repo |
|---|---|---|
| TypeScript "Classic" | `@solana/web3.js` | https://github.com/anagrambuild/swig-ts |
| TypeScript "Kit" | `@solana/kit` | same repo, `kit/` variant |
| Rust | — | https://github.com/anagrambuild/swig-wallet |

Examples live in `examples/classic/transfer/` and `examples/tutorial/` of `swig-ts`.

> The package monorepo uses `bun install` / `bun build:packages`. Specific npm package names aren't surfaced in the README excerpt — check `packages/` in the repo for the published name before installing.

## Tutorial structure (TypeScript, ~30 min)

1. Environment setup
2. Create your first SWIG
3. Manage authorities and actions
4. Sign transactions

## Developer Portal

Hosted dashboard at https://dashboard.onswig.com/ for managing wallets/keys + a portal-API example: https://build.onswig.com/examples/dev-portal

## Links

- Overview: https://build.onswig.com/
- TS Tutorial: https://build.onswig.com/tutorials/typescript
- TS SDK: https://github.com/anagrambuild/swig-ts
- Rust SDK: https://github.com/anagrambuild/swig-wallet
- Dev portal: https://dashboard.onswig.com/

## When to pick Swig over a raw agent keypair

- Agent needs to grant a sub-agent or LLM tool a **scoped** permission (single token, single program)
- Agent runs **autonomous schedules** (DCA, recurring payouts) and you don't want full custody on the executor
- You want **social recovery / multi-auth** instead of seed-phrase custody
- You need **paymaster** so the agent's USDC balance can pay for SOL gas
