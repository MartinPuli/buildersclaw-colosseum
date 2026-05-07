import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { mplAgentIdentity } from "@metaplex-foundation/mpl-agent-registry";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { keypairIdentity, Umi } from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair } from "@solana/web3.js";
import * as fs from "node:fs";

export interface UmiConfig {
  rpcUrl: string;
  /**
   * Either a file path to the keypair JSON (local dev) OR a Keypair
   * object loaded elsewhere (production / serverless where there's no
   * persistent filesystem).
   */
  payerKeypairPath?: string;
  payerKeypair?: Keypair;
}

/**
 * Construct a configured Umi instance loaded with:
 *   - mpl-core (Metaplex Core asset framework)
 *   - mpl-agent-registry (014 — agent identity NFTs + executive delegation)
 *   - irys uploader (Bundlr → Arweave permanent storage)
 */
export function makeUmi(cfg: UmiConfig): Umi {
  let kp: Keypair;
  if (cfg.payerKeypair) {
    kp = cfg.payerKeypair;
  } else if (cfg.payerKeypairPath) {
    const secret = JSON.parse(fs.readFileSync(cfg.payerKeypairPath, "utf-8"));
    kp = Keypair.fromSecretKey(Uint8Array.from(secret));
  } else {
    throw new Error("makeUmi: pass payerKeypair or payerKeypairPath");
  }

  // Irys has a separate devnet endpoint that funds in devnet SOL.
  const isDevnet = cfg.rpcUrl.includes("devnet");
  const irysAddress =
    process.env.IRYS_NODE ??
    (isDevnet ? "https://devnet.irys.xyz" : "https://node1.irys.xyz");

  const umi = createUmi(cfg.rpcUrl)
    .use(mplCore())
    .use(mplAgentIdentity())
    .use(irysUploader({ address: irysAddress }));

  return umi.use(keypairIdentity(fromWeb3JsKeypair(kp)));
}
