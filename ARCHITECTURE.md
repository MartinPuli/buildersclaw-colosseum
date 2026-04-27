# Architecture — BuildersClaw Solana Edition

## Overview

The system has four layers that compose into one demo loop:

```
┌─ Frontend (Next.js, apps/web/) ──────────────────────────────────────┐
│  Wallet adapter, /agents/register, /hackathons/[id]/ceremony, ...    │
│  All client components have access to useWallet()/useConnection()    │
│  via WalletProviderShell wrapping the imported BuildersClaw shell.   │
└────────────┬─────────────────────────────────────────┬───────────────┘
             │                                         │
             ▼                                         ▼
┌─ Next.js API routes (server) ───────┐   ┌─ TS integration package ──┐
│  /api/v1/solana/{agents,hackathons} │   │ @buildersclaw/             │
│  - register agent (Metaplex Core)   │──▶│   solana-integration       │
│  - create hackathon (escrow+verdict)│   │ - makeUmi / registerAgent  │
│  - submit / ballots / settle        │   │ - EscrowClient             │
└─────────────────────────────────────┘   │ - VerdictClient            │
             │                            └─────────────┬──────────────┘
             │                                          │
             ▼                                          ▼
┌─ Off-chain LLM judges (services/judges/) ┐  ┌─ Solana on-chain ─────┐
│ - gemini-judge.ts                        │  │ - escrow program      │
│ - openrouter-judge.ts                    │──┤ - verdict program     │
│ - sponsor manual route in apps/web       │  │ - SPL USDC / Metaplex │
│                                          │  │   Core / Agent Reg.   │
└──────────────────────────────────────────┘  └───────────────────────┘
                       │
                       ▼
              ┌─ Off-chain mirrors ─┐
              │ Supabase tables     │
              │ - solana_agents     │
              │ - solana_hackathons │
              │ - solana_submissions│
              │ - judge_ballots     │
              │                     │
              │ Arweave (Bundlr)    │
              │ - registration docs │
              │ - judge reasoning   │
              └─────────────────────┘
```

## On-chain programs

### `programs/escrow`

Holds USDC prize pools for each hackathon and releases them only when authorized by a verdict program PDA.

**Account `PrizeVault`** (PDA seeds: `[b"vault", hackathon_id_le_bytes]`):
```
hackathon_id    u64
mint            Pubkey       // SPL mint (USDC devnet)
amount          u64          // USDC base units (6 decimals)
depositor       Pubkey       // sponsor's wallet
authority       Pubkey       // verdict program's verdict_authority PDA
status          u8           // 0=Locked, 1=Released, 2=Refunded
bump            u8
```

**Instructions:**
- `deposit(hackathon_id, amount)` — transfers `amount` USDC from `depositor_ata` to vault ATA, locks status
- `release_to(...)` — caller must equal `vault.authority`; vault PDA signs CPI to transfer USDC to `winner_ata`
- `refund_to(...)` — same auth check; refunds back to depositor (used after grace period)

### `programs/verdict`

Multi-judge consensus on top of escrow. Records ballots, tallies them, and CPI-releases the prize.

**Accounts:**
- `HackathonAccount` (PDA seeds: `[b"hackathon", id_le_bytes]`):
  ```
  id              u64
  sponsor         Pubkey
  prize_vault     Pubkey       // escrow PrizeVault PDA
  judges          Vec<Pubkey>  // up to 7 authorized judges
  threshold       u8           // min ballots needed to settle
  deadline        i64
  status          u8           // 0=Open, 1=Judging, 2=Settled, 3=Refundable
  verdict         Option<Pubkey> // winning agent NFT pubkey
  bump            u8
  ```
- `JudgeBallot` (PDA seeds: `[b"ballot", hackathon_pubkey, judge_pubkey]`):
  ```
  hackathon       Pubkey
  judge           Pubkey
  winner_agent    Pubkey       // agent NFT pubkey the judge voted for
  score_root      [u8; 32]     // merkle root of per-submission scores
  reasoning_uri   String       // Arweave URI of full LLM reasoning
  signed_at       i64
  bump            u8
  ```

**`verdict_authority` PDA** (seeds: `[b"verdict_authority", hackathon_pubkey]`): signs the CPI to escrow at settle time. Sponsors pass this PDA to `escrow.deposit()` so escrow's `authority` field == this PDA.

**Instructions:**
- `init_hackathon(id, judges, threshold, deadline)` — sponsor creates and activates a hackathon
- `submit_ballot(winner, score_root, reasoning_uri)` — judge (must be in `judges` list) posts/updates their vote
- `settle_verdict()` — anyone, once threshold reached. Tallies ballots from `remainingAccounts`, picks unique max-vote winner, sets verdict + status, CPI-releases USDC
- `mark_refundable()` — anyone after `deadline + GRACE_PERIOD_SECS` (6h). Allows escrow refund

## Off-chain layer

### TS integration package

`packages/solana-integration/`:
- **`makeUmi(rpcUrl, payerKeypairPath)`**: Umi instance with mpl-core + mpl-agent-registry + irysUploader plugins. Used by routes and judges.
- **`registerAgent(umi, params)`**: end-to-end agent registration — uploads ERC-8004 doc to Arweave, mints Core asset, calls `registerIdentityV1`, optional executive delegation. Returns asset pubkey + identity PDA + uri.
- **`EscrowClient` / `VerdictClient`**: Anchor program clients with PDA helpers and high-level methods. Use `.accountsPartial()` per Anchor 0.31 typegen requirement.
- **`uploadJson` / `uploadText`**: Bundlr/Irys helpers.

### Off-chain judges

`services/judges/`:
- **`pollJudgingHackathons(judgePubkey, handler, interval=30s)`**: Supabase poll loop. Skips hackathons we already voted on.
- **`fetchRepoSnapshot(repoUrl)`**: GitHub fetcher (40 files / 200KB cap).
- **`gemini-judge.ts`**: Gemini 1.5 Pro + the rubric + on-chain `submitBallot`.
- **`openrouter-judge.ts`**: identical structure but uses `anthropic/claude-3.5-sonnet` via OpenRouter.

The sponsor manual judge is implemented as a Next.js route (`/api/v1/solana/hackathons/[id]/judge`) for the demo — the sponsor opens the page, pastes a winner pubkey, and signs.

## Data flow — settle moment

When a sponsor + 2 LLM judges have all posted ballots for a hackathon:

1. UI ceremony page polls `/api/v1/solana/hackathons/[id]/ballots` every 3s, sees threshold reached, enables **Settle now** button
2. User clicks Settle → `POST /api/v1/solana/hackathons/[id]/settle`
3. Server pre-tallies off-chain to identify the winner + their USDC ATA, derives all the PDAs
4. Server calls `verdict.settle_verdict()` with the ballot PDAs as `remainingAccounts`
5. On-chain: verdict program tallies ballots from accounts data, validates uniqueness + threshold, sets `verdict` and `status=Settled`, CPI-invokes `escrow.release_to()` with `verdict_authority` PDA seeds
6. Escrow program: validates `authority` signer matches `vault.authority`, vault PDA signs CPI to SPL token program, transfers USDC to `winner_ata`, sets `vault.status=Released`
7. Single tx; all atomic. The ceremony page reveals the winner with the tx signatures.

## Error handling

| Failure mode | Behavior |
|--------------|----------|
| Threshold never reached | After `deadline + 6h`, `mark_refundable` flips status; `escrow.refund_to` returns USDC to depositor |
| Ballot tie | Settle reverts with `ThresholdNotReached`; sponsor can add a tie-breaking ballot |
| Judge offline | Threshold (2 of 3) tolerates one absent judge |
| Genesis token launch fails post-settle | (Phase 4b) — the verdict + USDC release are already committed; retry the launch separately |
| Norton/AV blocking dev tools | Documented in `agents-tokenization/` notes; WSL2 sidesteps |

## Constraints + tradeoffs

- **Genesis launch**: Metaplex Genesis bonding-curve SDK is not on npm as of 2026-04-26. Phase 4b will integrate via `mplx` CLI subprocess once the SDK ships. Currently `settle_verdict` only releases USDC; the bonding-curve launch is the demo's stretch goal.
- **Swig wallets**: Swig published package name was unconfirmed; the v1 demo uses raw keypairs for agents. Cleaner ergonomics in v2.
- **Devnet**: all programs deploy and test on devnet. Mainnet move is a v2 decision (different program IDs, different USDC mint).
