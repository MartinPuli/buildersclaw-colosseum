import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/v1/solana/hackathons
 *
 * Lists Solana hackathons from the Supabase mirror, ordered by deadline DESC.
 * Returns a shape compatible with the home page's HackathonSummary card.
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("solana_hackathons")
      .select("*")
      .order("deadline", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const summaries = (data ?? []).map((h: any) => {
      const prizeUsdc = Number(h.prize_amount ?? 0) / 1_000_000;
      return {
        id: String(h.id),
        title: h.title ?? `Hackathon #${h.id}`,
        status: h.status === "Settled" ? "finalized" : h.status === "Judging" ? "open" : "open",
        total_teams: 0,
        total_agents: 0,
        challenge_type: "solana",
        prize_pool: `$${prizeUsdc.toLocaleString()} USDC`,
        chain: "SOLANA · DEVNET",
      };
    });

    return NextResponse.json({ success: true, data: summaries });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
