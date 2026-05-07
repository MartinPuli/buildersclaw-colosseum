import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { EscrowClient, VerdictClient } from "@buildersclaw/solana-integration";
import { supabaseAdmin } from "@/lib/supabase";
import {
  ESCROW_PROGRAM_ID,
  SOLANA_RPC,
  USDC_MINT,
} from "@/lib/solana-env";
import { loadBackendKeypair } from "@/lib/solana-keypair";

/**
 * POST /api/v1/solana/hackathons/[id]/settle
 *
 * Reads the ballots from Supabase, computes the off-chain consensus winner
 * (must match what the on-chain settle_verdict tally will compute), then
 * dispatches settle_verdict() with the ballot PDAs as remainingAccounts.
 *
 * settle_verdict CPI-releases USDC from escrow to the winner's USDC ATA.
 *
 * V1 demo simplification: the winner_ata is derived from the agent's
 * pubkey directly (treating the agent NFT mint as the wallet that
 * receives USDC). In Phase 4b we'll add a winner_owner field on
 * solana_agents to point at the human owner's wallet for the SPL ATA.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: hack, error: hackErr } = await supabaseAdmin
      .from("solana_hackathons")
      .select("*")
      .eq("id", id)
      .single();
    if (hackErr || !hack) {
      return NextResponse.json({ error: "hackathon not found" }, { status: 404 });
    }
    if (hack.status === "Settled") {
      return NextResponse.json(
        { error: "already settled", verdict_winner: hack.verdict_winner },
        { status: 409 }
      );
    }

    const { data: ballots } = await supabaseAdmin
      .from("judge_ballots")
      .select("*")
      .eq("hackathon_id", id);
    if (!ballots || ballots.length < hack.threshold) {
      return NextResponse.json(
        { error: "threshold not yet reached", ballots: ballots?.length ?? 0 },
        { status: 400 }
      );
    }

    // Off-chain tally — pick the agent with the most votes (must be unique
    // and >= threshold for the on-chain settle to succeed)
    const counts = new Map<string, number>();
    for (const b of ballots) {
      counts.set(b.winner_agent, (counts.get(b.winner_agent) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const [winner, votes] = sorted[0];
    const ties = sorted.filter(([_, v]) => v === votes).length;
    if (ties > 1 || votes < hack.threshold) {
      return NextResponse.json(
        { error: "no clear winner above threshold", tally: Object.fromEntries(counts) },
        { status: 400 }
      );
    }

    // Setup client
    const backend = loadBackendKeypair();
    const conn = new Connection(SOLANA_RPC, "confirmed");

    const verdict = new VerdictClient(conn, backend);
    const escrow = new EscrowClient(conn, backend);

    const winnerPubkey = new PublicKey(winner);
    const winnerAta = getAssociatedTokenAddressSync(
      new PublicKey(USDC_MINT),
      winnerPubkey,
      true // allowOwnerOffCurve — agent NFT mints are off-curve
    );

    const [hackPda] = verdict.hackathonPda(BigInt(id));
    const [vaultPda] = escrow.vaultPda(BigInt(id));
    const [vaultAta] = escrow.vaultAtaPda(vaultPda);
    const ballotPdas = ballots.map(
      (b) =>
        verdict.ballotPda(hackPda, new PublicKey(b.judge_pubkey))[0]
    );

    // Settle (CPI to escrow.release_to)
    const settleTx = await verdict.settleVerdict({
      hackathonId: BigInt(id),
      prizeVault: vaultPda,
      vaultAta,
      winnerAta,
      escrowProgramId: new PublicKey(ESCROW_PROGRAM_ID),
      ballotPdas,
    });

    // Update mirror
    await supabaseAdmin
      .from("solana_hackathons")
      .update({ status: "Settled", verdict_winner: winner })
      .eq("id", id);

    return NextResponse.json({
      winner,
      settleTx,
      winnerAta: winnerAta.toString(),
    });
  } catch (e: any) {
    console.error("settle failed:", e);
    return NextResponse.json(
      { error: e.message ?? String(e) },
      { status: 500 }
    );
  }
}
