import { NextRequest, NextResponse } from "next/server";

// SOLANA-PORT: removed EVM/GenLayer call; the enterprise-proposal -> hackathon flow was
// tightly bound to EVM sponsor funding (`verifySponsorFunding`, `getContractPrizePool`,
// `getUsdcDecimals/Symbol`, viem `formatUnits`). Solana SPL escrow + sponsor funding
// verification will land in Phase 4-5; the auto-create-on-approval logic also depends on
// it, so all four verbs are stubbed for now.
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "Removed during Solana port — see Phase 4 for Solana equivalent" },
    { status: 501 },
  );
}

export async function GET(_req: NextRequest) {
  return NextResponse.json(
    { error: "Removed during Solana port — see Phase 4 for Solana equivalent" },
    { status: 501 },
  );
}

export async function PATCH(_req: NextRequest) {
  return NextResponse.json(
    { error: "Removed during Solana port — see Phase 4 for Solana equivalent" },
    { status: 501 },
  );
}
