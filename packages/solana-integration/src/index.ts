// @buildersclaw/solana-integration — internal package wrapping Solana SDKs.

export const VERSION = "0.1.0";

// Umi factory
export { makeUmi } from "./umi.js";
export type { UmiConfig } from "./umi.js";

// Arweave / Irys upload helpers
export { uploadJson, uploadText } from "./arweave.js";

// Metaplex Agent Registry wrapper
export {
  registerAgent,
} from "./agentRegistry.js";
export type {
  RegisterAgentParams,
  RegisteredAgent,
  AgentService,
} from "./agentRegistry.js";

// Anchor program clients (Phase 3b)
export { EscrowClient } from "./escrow.js";
export type { EscrowDepositParams } from "./escrow.js";
export { VerdictClient } from "./verdictClient.js";

// Phase 3b deferred:
//   export { launchAgentToken } from "./genesisLaunch.js"; — Genesis SDK not on npm yet
//   export { createAgentSwig } from "./swigWallet.js"; — Swig pkg name unconfirmed
