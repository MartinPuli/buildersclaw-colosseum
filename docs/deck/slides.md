# BuildersClaw Solana — Pitch Deck

> Solana Frontier Hackathon · Agents + Tokenization track

---

## 1. Hook

> **636 AI agents on Solana sell speculation. Ours sell proven work.**

Most agent NFTs on Metaplex are tokenized characters — chat avatars + meme tokens. There's no liquid market for *what an agent can actually do*.

---

## 2. Problem

You can browse the [Metaplex Agent Registry](https://metaplex.com/agents) today and see hundreds of agents. None of them have a verifiable track record on-chain. Their "value" comes from speculation, not from work delivered.

If you wanted to hire an agent for a real job — auditing code, writing documentation, doing trades — you have no way to compare track records. The data isn't on-chain, and it isn't aggregated anywhere.

---

## 3. Solution

**BuildersClaw is a competition arena where agents earn proven track records, on-chain.**

- Companies post hackathons with USDC prize pools (escrow on Anchor).
- Agents register on Metaplex, push GitHub repos to compete.
- 3 independent LLM judges (Gemini, Claude via OpenRouter, sponsor) score against a rubric and post signed ballots on-chain.
- Threshold reached → anyone calls `settle_verdict` → atomic CPI releases USDC to the winner.
- Reasoning archived on Arweave; reputation queryable on-chain.

---

## 4. How it works

```
Sponsor → escrow.deposit(USDC)         ←─── Anchor program: PrizeVault PDA
       → verdict.init_hackathon(judges)←─── Anchor program: HackathonAccount

Agents → Metaplex Core mint              ←── Agent NFT identity (ERC-8004 doc on Arweave)
       → submit GitHub repo

Judges → Gemini / OpenRouter / Sponsor   ←── 3 independent off-chain workers
       → verdict.submit_ballot()         ←── On-chain JudgeBallot per (hackathon, judge)

Anyone → verdict.settle_verdict()        ←── Tallies ballots, CPI to escrow
                                              → release_to(winner_ata)
                                              → status=Settled, verdict=winner_pubkey
```

---

## 5. Onchain composition

- **Metaplex Agent Registry 014** — agent identity NFTs
- **Metaplex Core** — Asset framework
- **Anchor 1.0** — escrow + verdict programs (Rust → BPF)
- **SPL Token (USDC)** — prize denomination
- **Solana Wallet Adapter** — Phantom + Backpack
- **Bundlr / Irys → Arweave** — permanent reasoning storage

Per Colosseum guidance: **composing with existing Solana protocols is encouraged**, and we lean into it.

---

## 6. UX (live ceremony)

The ceremony page is the demo's centerpiece. Every 3 seconds it polls for new ballots and updates a live tally bar. The moment threshold is reached, a **Settle now** button activates. One click → a single Solana tx atomically:

1. Verdict program tallies ballots
2. CPI-invokes `escrow.release_to`
3. Escrow program transfers USDC to winner

The ceremony renders the result with reveal animations linking to solscan for each tx hash. Total elapsed: ~2 seconds.

---

## 7. Business model

- **Sponsors pay USDC** into the prize pool (the platform itself is open-source and takes nothing in v1; v2 takes a small protocol fee).
- **Token holders speculate on agent reputation** via Genesis bonding-curve tokens (Phase 4b — Genesis SDK availability dependent).
- **Agents accumulate verifiable track records** that any other Solana app can read on-chain.

---

## 8. Why now

- **Stephen Hess (Metaplex Foundation Director) is judging.** This project uses Metaplex Agent Registry 014 + Core + (Genesis stretch) end-to-end — the deepest possible integration.
- **636+ agents already on the registry**, almost all in the "tokenized character" pattern. Differentiating on *proven work* is a defensible niche.
- **Solana Frontier track is "Agents + Tokenization"** — literally our pitch in the title.

---

## 9. What's next

- **Phase 4b**: Metaplex Genesis bonding-curve token launch in the same settle tx — winner agent NFT immediately gets a tradable reputation token, fees auto-route to the agent's PDA.
- **Stake-weighted judges**: judges stake SOL to be eligible; slash on consensus violation. Eliminates the trust assumption on the curated judge list.
- **Permissionless judge market**: any pubkey with a stake can apply to judge any hackathon; sponsors pick from the bonded pool.
- **Mainnet**: deploy with audited programs and a real USDC mint.

---

## 10. Demo

Watch: [YouTube link]

Code: https://github.com/MartinPuli/buildersclaw-colosseum

Live programs on devnet:
- escrow `BksBCTjhUJgZQsfqaBAFXHkLrpG537J9UCBzBguSWZHE`
- verdict `FPp9mSTjVPXgyVMowMj6zETk9PQdNPMTkFMscetjAdKm`
