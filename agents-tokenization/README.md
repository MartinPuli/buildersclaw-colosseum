# Colosseum Frontier — Agents + Tokenization Track

> Build AI agents with onchain identity and economic functionality.
> Source: https://colosseum.com/frontier/resources

## Hackathon at a glance

- **Window:** April 6 – **May 11, 2026** (today is 2026-04-25 → **16 days left**)
- **Prizes:** $30K grand champion, $10K × 20 standouts, plus $10K Public Goods + $10K University
- **Real prize:** $250K SAFE + token warrant via Colosseum accelerator (winners only, 8-week SF + online)
- **Judges include:** Anatoly Yakovenko (Solana), Lily Liu (Solana Foundation), Stephen Hess (Metaplex Foundation)
- See [hackathon.md](hackathon.md) for full timeline, workshops, and tactical implications

## TL;DR — What this track gives you

The track is a stack: **identity → wallet → execution → economics → cross-chain**.

| Layer | Sponsor | What it solves |
|---|---|---|
| Coding-agent knowledge base | **Solana Foundation** Skills | Stops your AI coding agent from hallucinating Solana APIs (10 official + 40+ community skills) |
| Onchain identity (NFT-backed agents) | **Metaplex** Agent Kit / Registry 014 | Each agent is a Core NFT with a PDA, lifecycle hooks, ERC-8004 metadata |
| Programmable smart wallet | **Swig** | Roles, sessions, granular permissions for agent runtimes |
| Human-verified agents | **World** AgentKit | Distinguish human-backed agents from bots; gate paid endpoints with x402 |
| Cross-chain execution | **LI.FI** MCP / Skills | 27+ bridges, 31+ DEXs across 58 chains; read-only MCP for routing |
| Private execution | **Vanish** Core API | Disposable one-time wallets, ~200ms overhead, any aggregator |
| Token launch from agents | **Metaplex** Genesis | Bonding curve token tied to agent PDA, fees auto-routed |

## Files in this folder

- [hackathon.md](hackathon.md) — **READ FIRST** — dates, prizes, judges, workshops, scope implications
- [solana-skills.md](solana-skills.md) — **base layer** — Foundation-maintained skill packs for AI coding agents
- [metaplex.md](metaplex.md) — Agent Kit, Registry 014, Skill, token launch (Genesis)
- [swig.md](swig.md) — programmable smart wallets
- [lifi.md](lifi.md) — MCP server + agent skills for cross-chain
- [vanish.md](vanish.md) — private trading wrapper
- [world.md](world.md) — agent kit with World ID human verification

## Track-level signal (real adoption)

Metaplex registry currently lists **636 agents** on solana-mainnet (snapshot 2026-04-26), with multiple cohorts already shipping tokenized agents on bonding curves (e.g. IdollyAI's tokenized AI idol pattern: agent + Meteora DBC token + A2A protocol). **The pattern is real and saturated** — picking a vertical that isn't "tokenized AI character" is probably the right call for justkill.

## How to combine these (mental map)

```
[Coding agent] ──load Solana Skills──> Foundation baseline + per-tool packs
        │
        ▼
[Agent identity NFT] ──Metaplex Agent Registry──> discoverable, ERC-8004 doc
        │
        ├─ wallet ─> Swig (policies, sessions, multi-auth)
        │            └─> Vanish (private execution wrapper)
        │            └─> LI.FI MCP (cross-chain routing)
        │
        ├─ humans ─> World AgentKit (proof-of-human, x402 paid endpoints)
        │
        └─ economics ─> Metaplex Genesis (bonding curve token, fees → agent PDA)
```

## Recommended skills to install before coding

```bash
npx skills add https://github.com/solana-foundation/solana-dev-skill   # baseline
npx skills add metaplex                                                 # if using agent registry / Genesis
npx skills add <owner>/lifi-agent-skills                                # if cross-chain
npx skills add worldcoin/agentkit agentkit-x402                         # if using World
```

## Next step

Brainstorm idea against this stack — what specific job does an agent do that benefits from (a) onchain identity, (b) policy-controlled wallet, and (c) cross-chain or private execution?
