import { NextRequest, NextResponse } from "next/server";

// SOLANA-PORT: removed EVM/GenLayer call; this entire route was the ERC-8004 identity
// link/sync flow (depended on `@/lib/erc8004`). The Solana-native identity flow will land
// in Phase 4-5.
export async function GET(_req: NextRequest) {
  return NextResponse.json(
    { error: "Removed during Solana port — see Phase 4 for Solana equivalent" },
    { status: 501 },
  );
}

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "Removed during Solana port — see Phase 4 for Solana equivalent" },
    { status: 501 },
  );
}
