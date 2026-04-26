# Metaplex — Agent Kit, Registry 014, Genesis

**Role in the stack:** onchain identity + economics for Solana agents.

## What it is

Metaplex 014 Agent Registry binds an **MPL Core asset (NFT)** to an on-chain identity record. Each registered agent gets:

- A **PDA derived from the asset's pubkey** → discoverable on-chain
- An **AgentIdentity plugin** with lifecycle hooks for `Transfer`, `Update`, `Execute`
- An off-chain **ERC-8004 registration document** describing services (web, A2A, MCP), trust models, and skills
- A **built-in wallet** ("Asset Signer") on the Core asset itself

Plus the optional Genesis launchpad to spin up a bonding-curve token tied to that agent.

## Adoption signal

- 636 agents registered on mainnet at 2026-04-26
- Common pattern observed: agent NFT + Meteora DBC bonding curve + A2A protocol (IdollyAI cohort)

## SDK

```bash
npm i @metaplex-foundation/mpl-agent-registry @metaplex-foundation/mpl-core @metaplex-foundation/umi-bundle-defaults
```

## Skill (for coding agents)

```bash
npx skills add metaplex
```

Works with Claude Code, Cursor, Copilot, Codex, Windsurf. Covers six programs: Agent Registry, Genesis, Core, Token Metadata, Bubblegum, Candy Machine. Three execution modes: CLI (`mplx`), Umi SDK, Kit SDK.

## Key flows

### 1. Register an agent (bind identity to a Core asset)

```ts
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplAgentIdentity, registerIdentityV1 } from '@metaplex-foundation/mpl-agent-registry';

const umi = createUmi('https://api.mainnet-beta.solana.com').use(mplAgentIdentity());

await registerIdentityV1(umi, {
  asset: assetPublicKey,
  collection: collectionPublicKey,
  agentRegistrationUri: 'https://arweave.net/<doc-tx>',
}).sendAndConfirm(umi);
```

The `agentRegistrationUri` JSON (ERC-8004 shape):

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "Plexpert",
  "description": "...",
  "image": "https://arweave.net/<avatar>",
  "services": [
    { "name": "web", "endpoint": "https://example.com/agent/<PUBKEY>" },
    { "name": "A2A", "endpoint": ".../agent-card.json", "version": "0.3.0" },
    { "name": "MCP", "endpoint": ".../mcp", "version": "2025-06-18" }
  ],
  "supportedTrust": ["reputation", "crypto-economic"]
}
```

### 2. Run an agent (delegated execution model)

> **Solana doesn't support background tasks or on-chain inference.** An off-chain "executive" wallet signs on the agent's behalf via a delegation record.

```ts
// One-time per executive wallet
await registerExecutiveV1(umi, { payer: umi.payer }).sendAndConfirm(umi);

// Per agent: link executive
const agentIdentity   = findAgentIdentityV1Pda(umi, { asset: agentPublicKey });
const executiveProfile = findExecutiveProfileV1Pda(umi, { authority: executiveKey });

await delegateExecutionV1(umi, {
  agentAsset: agentPublicKey,
  agentIdentity,
  executiveProfile,
}).sendAndConfirm(umi);
```

### 3. Launch a token from an agent (Genesis bonding curve)

One token per agent, immutable once `setToken: true`. Fees auto-route to the agent's PDA.

```ts
const result = await createAndRegisterLaunch(umi, {}, {
  wallet: umi.identity.publicKey,
  agent: { mint: agentAssetAddress, setToken: true },
  launchType: 'bondingCurve',
  token: { name: 'Agent Token', symbol: 'AGT', image: '...' },
  launch: { firstBuyAmount: 0.1 } // optional, fees waived
});
```

Or via CLI:

```bash
mplx genesis launch create --launchType bonding-curve \
  --name "Agent Token" --symbol "AGT" --image "..." \
  --agentAsset <AGENT_ASSET> --agentSetToken
```

## Verifying registration

```ts
import { fetchAsset } from '@metaplex-foundation/mpl-core';
const data = await fetchAsset(umi, assetPublicKey);
const id = data.agentIdentities?.[0];
console.log(id?.uri, id?.lifecycleChecks?.execute);
```

## Links

- Agent Kit docs: https://metaplex.com/docs/agents
- Register an Agent: https://metaplex.com/docs/agents/register-agent
- Run an Agent: https://metaplex.com/docs/agents/run-an-agent
- Create Agent Token: https://metaplex.com/docs/agents/create-agent-token
- Skill page: https://metaplex.com/docs/agents/skill
- Public registry (browse 636+ live agents): https://metaplex.com/agents
- Developer portal: https://developers.metaplex.com/
