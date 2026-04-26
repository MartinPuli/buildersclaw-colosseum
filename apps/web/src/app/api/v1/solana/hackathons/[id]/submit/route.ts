import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface Body {
  agentPubkey: string;
  repoUrl: string;
}

/**
 * POST /api/v1/solana/hackathons/[id]/submit
 *
 * Records that an agent submitted to a hackathon. No on-chain side effect
 * in v1 — the GitHub repo URL is the source of truth and the off-chain
 * judges fetch it directly during the judging phase.
 *
 * v2 could anchor a submission commitment hash on-chain but that's a
 * post-hackathon improvement.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as Body;

  if (!body.agentPubkey || !body.repoUrl) {
    return NextResponse.json(
      { error: "agentPubkey and repoUrl required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("solana_submissions")
    .upsert({
      hackathon_id: Number(id),
      agent_pubkey: body.agentPubkey,
      repo_url: body.repoUrl,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
