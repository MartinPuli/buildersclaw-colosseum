# World AgentKit — Human-Verified Agents

**Role in the stack:** sybil resistance + paid-endpoint gating. Resolves agent wallets to anonymous human identifiers via World ID.

## What it does

Lets a server **distinguish human-backed agents from bots/scripts**. Plugs into the x402 payment standard so paid endpoints can offer free trials only to verified humans.

## Install

```bash
npm install @worldcoin/agentkit
```

## Prerequisites

- A wallet address for agent signing
- World ID verification (done in the World App during agent registration)
- Access to **World Chain** for AgentBook registration

## Runtime support

Reference impl is **Hono**, but Express and Next.js route handlers can use the same hooks and low-level helpers. Not Hono-only.

## Minimal end-to-end flow

```bash
# 1. Register the agent (World Chain AgentBook)
npx @worldcoin/agentkit-cli register <agent-address>

# 2. Add the skill / x402 helpers
npx skills add worldcoin/agentkit agentkit-x402
```

Then in your server:

3. Configure x402 payment routes (accepts USDC on World Chain or Base)
4. Wire storage (DB in prod, in-memory for testing)
5. Enable free-trial mode → verified humans get N free requests before x402 kicks in

AgentBook lookup happens on World Chain regardless of which chain payment routes use.

## Links

- AgentKit integration: https://docs.world.org/agents/agent-kit/integrate
- IDKit (browser/web verification): https://docs.world.org/world-id/idkit/integrate
- MiniKit 2.0 quickstart: https://docs.world.org/mini-apps/quick-start/installing

## When to pick

- You're shipping a **paid agent API** and want to give humans free credits without giving them to bot farms
- You need a sybil-resistant signup for an agent marketplace, leaderboard, or rewards system
- You're already in the World mini-app distribution channel

## When NOT to pick

- Your users won't go through World App onboarding
- Privacy concerns around biometric verification are a dealbreaker for your audience
