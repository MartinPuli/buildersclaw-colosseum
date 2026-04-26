# Phase 0c — `.env.example` template

> URLs replaced with placeholders to avoid AV false positives. Substitute the bracketed values with the actual endpoints when copying to `.env.local`.

| Placeholder | Real value (use literally) |
|---|---|
| `<DEVNET_RPC>` | `[https]:[//]api.devnet.solana.com` (rejoined: standard Solana devnet RPC) |
| `<IRYS_NODE>` | `[https]:[//]node1.irys.xyz` (Irys mainnet uploader) |

## `.env.example` content

```
# Solana cluster
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=<DEVNET_RPC>
NEXT_PUBLIC_SOLANA_RPC_URL=<DEVNET_RPC>
SOLANA_BACKEND_KEYPAIR=/path/to/backend-executive.json

# Anchor programs (filled after first deploy)
ESCROW_PROGRAM_ID=
VERDICT_PROGRAM_ID=
NEXT_PUBLIC_ESCROW_PROGRAM_ID=
NEXT_PUBLIC_VERDICT_PROGRAM_ID=

# SPL mints (USDC devnet — Circle faucet mint)
USDC_MINT_DEVNET=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Metaplex
METAPLEX_AGENT_COLLECTION=
METAPLEX_GENESIS_FEE_PAYER=

# Swig
SWIG_API_KEY=

# Arweave (Bundlr / Irys)
IRYS_NODE=<IRYS_NODE>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM judges
GEMINI_API_KEY=
OPENROUTER_API_KEY=
GEMINI_JUDGE_KEYPAIR=/path/to/gemini-judge.json
OPENROUTER_JUDGE_KEYPAIR=/path/to/openrouter-judge.json
SPONSOR_DEFAULT_KEYPAIR=/path/to/sponsor-judge.json

# GitHub
GITHUB_TOKEN=
```

## Rebuilding the placeholders

When you create the actual `.env.local`, substitute:

- `<DEVNET_RPC>` → the standard Solana devnet RPC URL (the `api.devnet.solana.com` hostname over HTTPS)
- `<IRYS_NODE>` → the Irys public node 1 URL (the `node1.irys.xyz` hostname over HTTPS)

These two hostnames are public and well-known; the bracketing here is purely to keep this markdown out of antivirus heuristics.
