import { NextRequest, NextResponse } from "next/server";

// SOLANA-PORT: removed EVM/GenLayer call; on-chain finalization (escrow payout to winners)
// will be replaced by a Solana program call planned in Phase 4-5.
// The original implementation depended on `@/lib/chain.finalizeHackathonOnChain` which is gone.
type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, _ctx: RouteParams) {
  return NextResponse.json(
    { error: "Removed during Solana port — see Phase 4 for Solana equivalent" },
    { status: 501 },
  );
}
