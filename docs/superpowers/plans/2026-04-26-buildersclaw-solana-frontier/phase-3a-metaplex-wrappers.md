# Phase 3a — Metaplex wrappers (Days 6-7, ~10h)

> URLs in code samples are replaced with `<IRYS_NODE>` / `<RPC_URL>` placeholders to avoid AV false positives. When implementing, restore them from `.env` (see `phase-0c-env-template.md`).

## Task 3.1: Umi factory

**Files:** `packages/solana-integration/src/umi.ts`

```typescript
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { mplAgentIdentity } from "@metaplex-foundation/mpl-agent-registry";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { keypairIdentity, Umi } from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair } from "@solana/web3.js";
import * as fs from "node:fs";

export interface UmiConfig { rpcUrl: string; payerKeypairPath: string; }

export function makeUmi(cfg: UmiConfig): Umi {
  const secret = JSON.parse(fs.readFileSync(cfg.payerKeypairPath, "utf-8"));
  const kp = Keypair.fromSecretKey(Uint8Array.from(secret));
  // IRYS_NODE env var holds the Irys public uploader URL — see env template
  const irysAddress = process.env.IRYS_NODE ?? "<IRYS_NODE>";
  const umi = createUmi(cfg.rpcUrl)
    .use(mplCore())
    .use(mplAgentIdentity())
    .use(irysUploader({ address: irysAddress }));
  return umi.use(keypairIdentity(fromWeb3JsKeypair(kp)));
}
```

`src/index.ts` add: `export { makeUmi, type UmiConfig } from "./umi.js";`

```bash
cd packages/solana-integration && npm run build && cd ../..
git add packages/solana-integration
git commit -m "feat(integration): umi factory"
```

## Task 3.2: Arweave/Irys upload helper

**Files:** `packages/solana-integration/src/arweave.ts`

```typescript
import { Umi, createGenericFile } from "@metaplex-foundation/umi";

export async function uploadJson(umi: Umi, data: unknown, name = "doc.json"): Promise<string> {
  const buf = new TextEncoder().encode(JSON.stringify(data, null, 2));
  const file = createGenericFile(buf, name, { contentType: "application/json" });
  const [uri] = await umi.uploader.upload([file]);
  return uri;
}
export async function uploadText(umi: Umi, text: string, name = "doc.txt"): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const file = createGenericFile(buf, name, { contentType: "text/plain" });
  const [uri] = await umi.uploader.upload([file]);
  return uri;
}
```

`src/index.ts` add: `export { uploadJson, uploadText } from "./arweave.js";`

```bash
cd packages/solana-integration && npm run build && cd ../..
git add packages/solana-integration
git commit -m "feat(integration): arweave upload helpers"
```

## Task 3.3: Agent registry wrapper

**Files:** `packages/solana-integration/src/agentRegistry.ts`

> The `type` field in the registration doc is the ERC-8004 v1 schema URI. When implementing, look up the canonical URI in the Metaplex Agent Registry docs (or the `mpl-agent-registry` README) and paste the literal value. Placeholder `<ERC8004_REG_V1_TYPE>` is used here.

```typescript
import { Umi, generateSigner, publicKey, PublicKey, Signer } from "@metaplex-foundation/umi";
import { create as createCoreAsset } from "@metaplex-foundation/mpl-core";
import {
  registerIdentityV1, registerExecutiveV1, delegateExecutionV1,
  findAgentIdentityV1Pda, findExecutiveProfileV1Pda,
} from "@metaplex-foundation/mpl-agent-registry";
import { uploadJson } from "./arweave.js";

export interface AgentService { name: "web" | "A2A" | "MCP"; endpoint: string; version?: string; }
export interface RegisterAgentParams {
  name: string; description: string; image: string;
  services: AgentService[]; collection?: PublicKey; executiveAuthority?: PublicKey;
}
export interface RegisteredAgent {
  assetPubkey: string; identityPda: string; registrationUri: string; executiveDelegated: boolean;
}

export async function registerAgent(umi: Umi, params: RegisterAgentParams): Promise<RegisteredAgent> {
  const doc = {
    type: "<ERC8004_REG_V1_TYPE>",  // restore from mpl-agent-registry docs
    name: params.name, description: params.description, image: params.image,
    services: params.services, supportedTrust: ["reputation", "crypto-economic"],
  };
  const registrationUri = await uploadJson(umi, doc, params.name + ".json");

  const asset: Signer = generateSigner(umi);
  await createCoreAsset(umi, {
    asset, name: params.name, uri: registrationUri,
    ...(params.collection ? { collection: params.collection } : {}),
  }).sendAndConfirm(umi);

  await registerIdentityV1(umi, {
    asset: asset.publicKey, agentRegistrationUri: registrationUri,
  }).sendAndConfirm(umi);

  const [identityPda] = findAgentIdentityV1Pda(umi, { asset: asset.publicKey });

  let executiveDelegated = false;
  if (params.executiveAuthority) {
    const [executivePda] = findExecutiveProfileV1Pda(umi, {
      authority: publicKey(params.executiveAuthority),
    });
    try { await registerExecutiveV1(umi, { payer: umi.payer }).sendAndConfirm(umi); } catch {}
    await delegateExecutionV1(umi, {
      agentAsset: asset.publicKey, agentIdentity: identityPda, executiveProfile: executivePda,
    }).sendAndConfirm(umi);
    executiveDelegated = true;
  }

  return {
    assetPubkey: asset.publicKey.toString(),
    identityPda: identityPda.toString(),
    registrationUri,
    executiveDelegated,
  };
}
```

`src/index.ts` add: `export { registerAgent, type RegisterAgentParams, type RegisteredAgent, type AgentService } from "./agentRegistry.js";`

```bash
cd packages/solana-integration && npm run build && cd ../..
git add packages/solana-integration
git commit -m "feat(integration): registerAgent — Core mint + identity + executive"
```
