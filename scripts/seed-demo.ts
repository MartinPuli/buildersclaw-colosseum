/**
 * End-to-end demo seed script.
 *
 * Runs the full BuildersClaw Solana flow against devnet using only the
 * env vars in .env.local. Creates two demo agents, opens a hackathon,
 * has 2 judges vote, settles, and reports the solscan links so the
 * outcome can be embedded in the demo video / submission.
 *
 * Run from repo root via:
 *   ./scripts/e2e-smoke.sh
 *
 * Pre-requisites (besides .env.local):
 *   - At least ~3 SOL on SOLANA_BACKEND_KEYPAIR (covers 2x agent mints +
 *     deposit + init + ballots + settle)
 *   - The judge keypairs (GEMINI_JUDGE_KEYPAIR + OPENROUTER_JUDGE_KEYPAIR)
 *     must each have ~0.05 SOL for tx fees
 *   - SOLANA_BACKEND_KEYPAIR's USDC ATA on devnet must be funded with
 *     at least 100 USDC (use https://faucet.circle.com)
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import {
  EscrowClient,
  VerdictClient,
} from "@buildersclaw/solana-integration";
import * as fs from "node:fs";

const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const conn = new Connection(RPC, "confirmed");

function load(p: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8")))
  );
}

async function main() {
  // ---- Setup keypairs ----
  // Backend is the sponsor + fee payer. Judges are generated fresh per
  // run and funded from backend (avoids needing 3 separate keypair files
  // and devnet airdrop rate limits).
  const backend = load(process.env.SOLANA_BACKEND_KEYPAIR!);
  const judgeA = Keypair.generate();
  const judgeB = Keypair.generate();

  console.log("backend pubkey:", backend.publicKey.toString());
  console.log("judgeA pubkey: ", judgeA.publicKey.toString());
  console.log("judgeB pubkey: ", judgeB.publicKey.toString());

  // Fund judges (each needs ~0.005 SOL for ballot tx fee)
  console.log("\n[0] Funding judges from backend…");
  const fundTx = new Transaction()
    .add(
      SystemProgram.transfer({
        fromPubkey: backend.publicKey,
        toPubkey: judgeA.publicKey,
        lamports: 0.02 * 1e9,
      })
    )
    .add(
      SystemProgram.transfer({
        fromPubkey: backend.publicKey,
        toPubkey: judgeB.publicKey,
        lamports: 0.02 * 1e9,
      })
    );
  const fundSig = await sendAndConfirmTransaction(conn, fundTx, [backend]);
  console.log("    fund:", fundSig);

  // ---- Step 1: Generate two demo agents ----
  // For the demo, we use Keypairs as agent identities. The full Metaplex
  // Agent Registry registration (registerIdentityV1) requires a registered
  // agent collection on Solana mainnet/devnet, which is set up separately
  // (Phase 4b: deploy a BuildersClaw agents collection then re-enable
  // registerAgent in this script).
  //
  // The escrow + verdict + settle flow doesn't require registry membership;
  // it only treats agent pubkeys as opaque destinations for prize routing.
  console.log("\n[1] Generating demo agent keypairs…");
  const plexpert = { assetPubkey: Keypair.generate().publicKey.toString() };
  const anchorette = { assetPubkey: Keypair.generate().publicKey.toString() };
  console.log("    Plexpert:  ", plexpert.assetPubkey);
  console.log("    Anchorette:", anchorette.assetPubkey);

  // ---- Step 2: Sponsor opens hackathon + deposits prize ----
  console.log("\n[2] Sponsor creates hackathon + deposits 5 USDC…");
  const usdcMint = new PublicKey(
    process.env.USDC_MINT_DEVNET ??
      "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  );
  const sponsorAta = await getOrCreateAssociatedTokenAccount(
    conn,
    backend,
    usdcMint,
    backend.publicKey
  );

  const id = BigInt(Math.floor(Date.now() / 1000));
  const escrow = new EscrowClient(conn, backend);
  const verdict = new VerdictClient(conn, backend);
  const [hackPda] = verdict.hackathonPda(id);
  const [verdictAuthority] = verdict.verdictAuthorityPda(hackPda);
  const [vaultPda] = escrow.vaultPda(id);

  // 5 USDC — small enough that 20 USDC funded ATA can run 4 demos
  const PRIZE_USDC_BASE = 5_000_000n;
  const depositTx = await escrow.deposit({
    hackathonId: id,
    amount: PRIZE_USDC_BASE,
    mint: usdcMint,
    depositorAta: sponsorAta.address,
    verdictAuthority,
  });
  console.log("    deposit:", depositTx);

  const initTx = await verdict.initHackathon({
    id,
    judges: [judgeA.publicKey, judgeB.publicKey],
    threshold: 2,
    deadline: Math.floor(Date.now() / 1000) + 3600,
    prizeVault: vaultPda,
  });
  console.log("    init:   ", initTx);

  // ---- Step 3: Judges vote ----
  console.log("\n[3] Both judges vote for Plexpert (the winner)…");
  const winnerAgentPubkey = new PublicKey(plexpert.assetPubkey);

  for (const j of [judgeA, judgeB]) {
    const v = new VerdictClient(conn, j);
    const sig = await v.submitBallot({
      hackathonId: id,
      judge: j,
      winnerAgent: winnerAgentPubkey,
      scoreRoot: Array(32).fill(0),
      reasoningUri: "ar://demo-seed-script",
    });
    console.log(`    ${j.publicKey.toString().slice(0, 8)}…: ${sig}`);
  }

  // ---- Step 4: Settle (CPI releases USDC) ----
  console.log("\n[4] Settling — CPI releases USDC to Plexpert…");
  const winnerAta = await getOrCreateAssociatedTokenAccount(
    conn,
    backend,
    usdcMint,
    winnerAgentPubkey,
    true // allowOwnerOffCurve — agent NFT mints are off-curve
  );

  const ballotPdas = [judgeA, judgeB].map(
    (j) => verdict.ballotPda(hackPda, j.publicKey)[0]
  );
  const [vaultAta] = escrow.vaultAtaPda(vaultPda);

  const settleTx = await verdict.settleVerdict({
    hackathonId: id,
    prizeVault: vaultPda,
    vaultAta,
    winnerAta: winnerAta.address,
    escrowProgramId: new PublicKey(
      process.env.ESCROW_PROGRAM_ID ??
        "BksBCTjhUJgZQsfqaBAFXHkLrpG537J9UCBzBguSWZHE"
    ),
    ballotPdas,
  });
  console.log("    settle:", settleTx);

  // ---- Final report ----
  const cluster = "devnet";
  console.log("\n=== DONE — solscan links for the demo video ===");
  console.log(`  Plexpert NFT:  https://solscan.io/account/${plexpert.assetPubkey}?cluster=${cluster}`);
  console.log(`  Anchorette NFT:https://solscan.io/account/${anchorette.assetPubkey}?cluster=${cluster}`);
  console.log(`  Deposit:       https://solscan.io/tx/${depositTx}?cluster=${cluster}`);
  console.log(`  Init:          https://solscan.io/tx/${initTx}?cluster=${cluster}`);
  console.log(`  Settle:        https://solscan.io/tx/${settleTx}?cluster=${cluster}`);
  console.log(`  Hackathon PDA: https://solscan.io/account/${hackPda.toString()}?cluster=${cluster}`);
  console.log(`  Vault PDA:     https://solscan.io/account/${vaultPda.toString()}?cluster=${cluster}`);
  console.log(`  Winner ATA:    https://solscan.io/account/${winnerAta.address.toString()}?cluster=${cluster}`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
