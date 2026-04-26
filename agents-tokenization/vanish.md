# Vanish — Private Agent Trading on Solana

**Role in the stack:** privacy/MEV wrapper around any DEX aggregator. Adds ~200ms; otherwise transparent.

## What it does

Routes trades through **disposable one-time wallets temporarily funded from Vanish's trading accounts** so the originating agent wallet leaves no on-chain trace. Intended use: agents whose strategy would be copied/sniped if visible.

## Mechanism

1. Fund your Vanish account with SOL/SPL tokens
2. Submit a standard swap tx (any aggregator — Jupiter, etc.) to Vanish for private wrapping
3. Vanish routes through a disposable wallet → submits via **Jito bundles by default**, or returns a signed payload for self-broadcast
4. Atomic settlement — output tokens land in your Vanish balance
5. Call `/commit` with the tx signature for settlement

## Cost / perf

- Latency: ~200ms added from submission to settlement
- Compatibility: any aggregator, no changes to routing/slippage/exec params
- Auth: API key via `x-api-key` header

## SDKs

- TypeScript and Rust quickstarts (claim: "<30 min to running")
- Onboarding via Discord (API keys)

## Endpoints (only `/health` is documented in the public refs page)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | service health (returns `healthy`) |

> The reference page surface area is small — full endpoint catalog is at https://core.vanish.trade/llms.txt. Read that before integrating.

## Links

- Developer Docs: https://core.vanish.trade/
- API Reference: https://core.vanish.trade/api-reference
- llms.txt (full endpoint list): https://core.vanish.trade/llms.txt

## When to pick

- Agent trades a strategy where **on-chain visibility = alpha decay** (e.g. sniping new launches, large directional swaps)
- You want privacy without rolling your own MEV-protected RPC
- You're already on Solana + Jupiter and don't want to change routing

## When NOT to pick

- You need **fully on-chain traceability** for compliance / audit / proof-of-reserves
- Custodial settlement (output lands in Vanish balance first) is a blocker
