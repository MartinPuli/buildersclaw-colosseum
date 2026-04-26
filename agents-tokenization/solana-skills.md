# Solana Skills — Foundation-maintained skill packs

**Role in the stack:** knowledge layer for AI coding agents working on Solana. Not a runtime/SDK — these are skill packs you load into Claude Code / Cursor so the agent **stops hallucinating Solana APIs**.

## What it is

Pre-built skills you can drop into AI coding agents to interact with Solana programs, tokens, and tooling. Maintained by Solana Foundation + community.

## Install

```bash
npx skills add https://github.com/solana-foundation/solana-dev-skill
```

(Installs the Foundation-maintained set. Community skills install per repo.)

## Catalog

### Official (Solana Foundation)

- Common Errors & Solutions
- Version Compatibility Matrix
- Confidential Transfers
- Frontend with framework-kit
- IDL & Client Code Generation
- Kit ↔ web3.js Interop
- Payments & Commerce
- Curated Resources
- Security Checklist
- Testing Strategy

### Community (40+ skills, partial list)

| Category | Skills |
|---|---|
| DeFi | Jupiter, Raydium, Orca, Kamino, PumpFun, Sanctum |
| Infra | **Metaplex**, Helius, Pyth, Switchboard, Light Protocol, deBridge |
| Tools | Solana Kit, VulnHunter, Code Recon, Surfpool |
| Other | NFTs, oracles, games, trading protocols |

## Platforms

Claude Code, Cursor (and any platform supporting the Agent Skills format).

## Why this matters for the track

This is the **base layer** that makes the rest of the stack practical to build with an AI agent. Recommended install set for this hackathon:

```bash
npx skills add https://github.com/solana-foundation/solana-dev-skill   # official baseline
npx skills add metaplex                                                 # agent registry + Genesis
npx skills add <owner>/lifi-agent-skills                                # cross-chain
npx skills add worldcoin/agentkit agentkit-x402                         # only if using World
```

## Links

- Catalog (ES): https://solana.com/es/skills
- Catalog (EN): https://solana.com/skills
- Foundation skill repo: https://github.com/solana-foundation/solana-dev-skill
