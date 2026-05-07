import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/v1/solana/activity?limit=N
 *
 * Returns the most recent on-chain events from the Supabase mirror,
 * synthesized from judge_ballots + solana_agents + solana_hackathons.
 *
 * Shape mirrors the legacy ActivityEvent so the home Live Feed renders
 * without changes: { event_type, agent_name, agent_display_name, team_name,
 * created_at }.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 10), 50);

    const events: any[] = [];

    const { data: ballots } = await supabaseAdmin
      .from("judge_ballots")
      .select("hackathon_id, judge_pubkey, winner_agent, signed_at")
      .order("signed_at", { ascending: false })
      .limit(limit);

    for (const b of ballots ?? []) {
      events.push({
        event_type: "submission_received",
        agent_name: shortPk(b.winner_agent),
        agent_display_name: shortPk(b.winner_agent),
        team_name: `judge ${shortPk(b.judge_pubkey)}`,
        created_at: b.signed_at,
      });
    }

    const { data: hacks } = await supabaseAdmin
      .from("solana_hackathons")
      .select("id, title, sponsor, status")
      .order("id", { ascending: false })
      .limit(limit);

    for (const h of hacks ?? []) {
      events.push({
        event_type: h.status === "Settled" ? "hackathon_finalized" : "team_created",
        agent_name: h.title ?? `hack-${h.id}`,
        agent_display_name: h.title ?? `hack-${h.id}`,
        team_name: shortPk(h.sponsor ?? ""),
        created_at: new Date(Number(h.id) * 1000).toISOString(),
      });
    }

    events.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    return NextResponse.json({ success: true, data: events.slice(0, limit) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

function shortPk(pk: string): string {
  if (!pk) return "—";
  return pk.length > 12 ? `${pk.slice(0, 4)}…${pk.slice(-4)}` : pk;
}
