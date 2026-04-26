import {
  Umi,
  generateSigner,
  publicKey,
  PublicKey,
  Signer,
} from "@metaplex-foundation/umi";
import { create as createCoreAsset } from "@metaplex-foundation/mpl-core";
import {
  registerIdentityV1,
  registerExecutiveV1,
  delegateExecutionV1,
  findAgentIdentityV1Pda,
  findExecutiveProfileV1Pda,
} from "@metaplex-foundation/mpl-agent-registry";

import { uploadJson } from "./arweave.js";

export interface AgentService {
  name: "web" | "A2A" | "MCP";
  endpoint: string;
  version?: string;
}

export interface RegisterAgentParams {
  name: string;
  description: string;
  image: string;
  services: AgentService[];
  /**
   * Optional executive authority (the off-chain backend wallet that signs
   * on behalf of the agent at runtime). When set, registerAgent also
   * registers the executive profile and delegates execution to it.
   */
  executiveAuthority?: PublicKey;
  // collection?: PublicKey;  // re-add in Phase 4 with Metaplex CollectionV1 reference shape
}

export interface RegisteredAgent {
  assetPubkey: string;
  identityPda: string;
  registrationUri: string;
  executiveDelegated: boolean;
}

/**
 * End-to-end agent registration on Solana via Metaplex Agent Registry 014.
 *
 * Flow (per Metaplex docs):
 *   1. Build the ERC-8004 registration JSON describing the agent's services
 *      (web, A2A, MCP) and trust models. Upload to Arweave; get back URI.
 *   2. Mint a Core asset (the agent NFT). uri = the registration JSON URI.
 *   3. Call registerIdentityV1 to bind the identity record to the asset.
 *   4. Optionally register an executive profile + delegate execution so the
 *      backend can sign txs on the agent's behalf.
 *
 * The result includes the asset pubkey (treat as the agent's canonical
 * Solana identity) and the identity PDA derived from the asset.
 */
export async function registerAgent(
  umi: Umi,
  params: RegisterAgentParams
): Promise<RegisteredAgent> {
  // 1. Build + upload registration doc (ERC-8004 v1 schema)
  const doc = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: params.name,
    description: params.description,
    image: params.image,
    services: params.services,
    supportedTrust: ["reputation", "crypto-economic"],
  };
  const registrationUri = await uploadJson(umi, doc, `${params.name}.json`);

  // 2. Mint Core asset (no collection in v1; add in Phase 4 once we have a
  //    BuildersClaw agents collection minted on devnet)
  const asset: Signer = generateSigner(umi);
  await createCoreAsset(umi, {
    asset,
    name: params.name,
    uri: registrationUri,
  }).sendAndConfirm(umi);

  // 3. Register identity (binds asset → registration_uri on-chain)
  await registerIdentityV1(umi, {
    asset: asset.publicKey,
    agentRegistrationUri: registrationUri,
  }).sendAndConfirm(umi);

  const [identityPda] = findAgentIdentityV1Pda(umi, {
    asset: asset.publicKey,
  });

  // 4. Optional executive delegation
  let executiveDelegated = false;
  if (params.executiveAuthority) {
    const [executivePda] = findExecutiveProfileV1Pda(umi, {
      authority: publicKey(params.executiveAuthority),
    });

    // registerExecutiveV1 fails idempotently if already registered
    try {
      await registerExecutiveV1(umi, { payer: umi.payer }).sendAndConfirm(umi);
    } catch {
      // already registered — fine
    }

    await delegateExecutionV1(umi, {
      agentAsset: asset.publicKey,
      agentIdentity: identityPda,
      executiveProfile: executivePda,
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
