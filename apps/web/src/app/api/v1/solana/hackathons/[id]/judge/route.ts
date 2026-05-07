import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  VerdictClient,
  makeUmi,
  uploadText,
} from "@buildersclaw/solana-integration";
import { supabaseAdmin } from "@/lib/supabase";
import { SOLANA_RPC } from "@/lib/solana-env";
import { loadSponsorKeypair } from "@/lib/solana-keypair";

interface Body {
  winnerAgent: string;
  reasoning: string;
}

/**
 * POST /api/v1/solana/hackathons/[id]/judge
 *
 * Sponsor manual judge — signs a JudgeBallot tx using the SPONSOR_DEFAULT_KEYPAIR
 * and uploads the human reasoning to Arweave. Mirrors to judge_ballots so the
 * ceremony page picks it up via the polling endpoint.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Body;

    if (!body.winnerAgent || !body.reasoning) {
      return NextResponse.json(
        { error: "winnerAgent and reasoning required" },
        { status: 400 }
      );
    }

    const sponsorKp = loadSponsorKeypair();
    const conn = new Connection(SOLANA_RPC, "confirmed");
    const verdict = new VerdictClient(conn, sponsorKp);
    const umi = makeUmi({
      rpcUrl: SOLANA_RPC,
      payerKeypair: sponsorKp,
    });

    const reasoningUri = await uploadText(
      umi,
      body.reasoning,
      `sponsor-${id}.txt`
    );

    const sig = await verdict.submitBallot({
      hackathonId: BigInt(id),
      judge: sponsorKp,
      winnerAgent: new PublicKey(body.winnerAgent),
      scoreRoot: Array(32).fill(0),
      reasoningUri,
    });

    await supabaseAdmin.from("judge_ballots").insert({
      hackathon_id: Number(id),
      judge_pubkey: sponsorKp.publicKey.toString(),
      winner_agent: body.winnerAgent,
      score_root: Buffer.alloc(32).toString("hex"),
      reasoning_uri: reasoningUri,
      tx_signature: sig,
      signed_at: new Date().toISOString(),
    });

    return NextResponse.json({ tx: sig, reasoningUri });
  } catch (e: any) {
    console.error("sponsor judge failed:", e);
    return NextResponse.json(
      { error: e.message ?? String(e) },
      { status: 500 }
    );
  }
}
