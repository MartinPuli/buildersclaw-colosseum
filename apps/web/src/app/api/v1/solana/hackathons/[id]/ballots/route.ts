import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/v1/solana/hackathons/[id]/ballots
 *
 * Public read of ballots posted for this hackathon (mirrored from on-chain
 * judge_ballots inserts). Used by the ceremony page to render live counts
 * via 3-second polling.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("judge_ballots")
    .select("*")
    .eq("hackathon_id", id)
    .order("signed_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
