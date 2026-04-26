import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { EscrowClient, VerdictClient } from "@buildersclaw/solana-integration";
import { supabaseAdmin } from "@/lib/supabase";
import {
  ESCROW_PROGRAM_ID,
  VERDICT_PROGRAM_ID,
  SOLANA_RPC,
  USDC_MINT,
  serverEnv,
} from "@/lib/solana-env";
import * as fs from "node:fs";

interface Body {
  title: string;
  description?: string;
  prizeAmount: number; // in USDC base units (6 decimals)
  deadlineUnix: number;
  judges: string[]; // pubkey strings
  threshold: number;
  depositorAta: string; // sponsor's USDC ATA on devnet
  sponsorPubkey: string;
}

/**
 * POST /api/v1/solana/hackathons/create
 *
 * Composes the two-tx setup:
 *   1. EscrowClient.deposit() — sponsor (backend proxy) locks USDC into a
 *      PrizeVault PDA, with verdict_authority set to the verdict program's
 *      verdict_authority PDA (derived from hackathon PDA)
 *   2. VerdictClient.initHackathon() — sponsor declares judges + threshold +
 *      deadline. Status defaults to Judging.
 *
 * Mirrors to solana_hackathons in Supabase. Returns the hackathon id (which
 * is == the Unix-second timestamp at create time, used as the seed in PDAs).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    if (
      !body.title ||
      !body.judges?.length ||
      body.threshold < 1 ||
      body.threshold > body.judges.length
    ) {
      return NextResponse.json(
        { error: "title, judges (>=1), threshold (1..judges.length) required" },
        { status: 400 }
      );
    }

    const secret = JSON.parse(
      fs.readFileSync(serverEnv.backendKeypair(), "utf-8")
    );
    const backend = Keypair.fromSecretKey(Uint8Array.from(secret));
    const conn = new Connection(SOLANA_RPC, "confirmed");

    const verdict = new VerdictClient(conn, backend);
    const escrow = new EscrowClient(conn, backend);

    // Derive PDAs deterministically from the hackathon id (== now in seconds)
    const id = BigInt(Math.floor(Date.now() / 1000));
    const [hackPda] = verdict.hackathonPda(id);
    const [verdictAuthority] = verdict.verdictAuthorityPda(hackPda);
    const [vaultPda] = escrow.vaultPda(id);

    // 1. Deposit prize into escrow vault
    const depositTx = await escrow.deposit({
      hackathonId: id,
      amount: BigInt(body.prizeAmount),
      mint: new PublicKey(USDC_MINT),
      depositorAta: new PublicKey(body.depositorAta),
      verdictAuthority,
    });

    // 2. Initialize the hackathon
    const initTx = await verdict.initHackathon({
      id,
      judges: body.judges.map((s) => new PublicKey(s)),
      threshold: body.threshold,
      deadline: body.deadlineUnix,
      prizeVault: vaultPda,
    });

    // 3. Mirror to Supabase
    const { error: dbError } = await supabaseAdmin
      .from("solana_hackathons")
      .insert({
        id: Number(id),
        sponsor: body.sponsorPubkey,
        title: body.title,
        description: body.description,
        prize_vault: vaultPda.toString(),
        prize_amount: body.prizeAmount,
        deadline: new Date(body.deadlineUnix * 1000).toISOString(),
        status: "Judging",
        judges: body.judges,
        threshold: body.threshold,
      });

    return NextResponse.json({
      id: Number(id),
      hackathon: hackPda.toString(),
      vault: vaultPda.toString(),
      verdictAuthority: verdictAuthority.toString(),
      depositTx,
      initTx,
      mirrorWarning: dbError ? "supabase insert failed" : undefined,
    });
  } catch (e: any) {
    console.error("create hackathon failed:", e);
    return NextResponse.json(
      { error: e.message ?? String(e) },
      { status: 500 }
    );
  }
}
