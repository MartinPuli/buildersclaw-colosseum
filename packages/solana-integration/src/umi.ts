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
  payerKeypairPath: string;
}

/**
 * Construct a configured Umi instance loaded with:
 *   - mpl-core (Metaplex Core asset framework)
 *   - mpl-agent-registry (014 — agent identity NFTs + executive delegation)
 *   - irys uploader (Bundlr → Arweave permanent storage)
 *
 * The payer keypair is the wallet that pays for tx fees + Arweave uploads.
 * For the BuildersClaw backend it's the executive wallet declared in
 * SOLANA_BACKEND_KEYPAIR; for tests it's the dev wallet.
 */
export function makeUmi(cfg: UmiConfig): Umi {
  const secret = JSON.parse(fs.readFileSync(cfg.payerKeypairPath, "utf-8"));
  const kp = Keypair.fromSecretKey(Uint8Array.from(secret));

  // Irys has a separate devnet endpoint that funds in devnet SOL.
  // Mainnet uses node1.irys.xyz; devnet uses devnet.irys.xyz.
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
