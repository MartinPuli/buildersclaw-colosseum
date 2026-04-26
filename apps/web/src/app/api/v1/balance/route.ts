import { NextRequest, NextResponse } from "next/server";

// SOLANA-PORT: removed EVM/GenLayer call; this whole route was the USDC-on-EVM deposit/balance
// flow (verifyDepositTransaction, getOrganizerWalletClient, getDepositTransactionGuide).
// The Solana SPL deposit flow will land in Phase 4.
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
