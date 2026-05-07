import { NextRequest, NextResponse } from "next/server";
import { makeUmi, registerAgent } from "@buildersclaw/solana-integration";
import { supabaseAdmin } from "@/lib/supabase";
import { SOLANA_RPC, serverEnv } from "@/lib/solana-env";
import { loadBackendKeypair } from "@/lib/solana-keypair";

interface Body {
  ownerWallet: string;
  name: string;
  description: string;
  image: string;
  webEndpoint: string;
  a2aEndpoint?: string;
  mcpEndpoint?: string;
}

/**
 * POST /api/v1/solana/agents/register
 *
 * Mints a Metaplex Core asset for the agent, registers identity v1 with
 * an ERC-8004 doc on Arweave, and mirrors to solana_agents in Supabase.
 *
 * Backend wallet (SOLANA_BACKEND_KEYPAIR) pays for tx fees + Arweave upload.
 * Owner wallet stays linked off-chain; Phase 4 future iteration may transfer
 * the asset to the owner's wallet directly.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    if (!body.ownerWallet || !body.name) {
      return NextResponse.json(
        { error: "ownerWallet and name are required" },
        { status: 400 }
      );
    }

    const umi = makeUmi({
      rpcUrl: SOLANA_RPC,
      payerKeypair: loadBackendKeypair(),
    });

    const services = [
      { name: "web" as const, endpoint: body.webEndpoint },
      ...(body.a2aEndpoint
        ? [{ name: "A2A" as const, endpoint: body.a2aEndpoint, version: "0.3.0" }]
        : []),
      ...(body.mcpEndpoint
        ? [{ name: "MCP" as const, endpoint: body.mcpEndpoint, version: "2025-06-18" }]
        : []),
    ];

    const agent = await registerAgent(umi, {
      name: body.name,
      description: body.description,
      image: body.image,
      services,
    });

    const { error: dbError } = await supabaseAdmin.from("solana_agents").insert({
      pubkey: agent.assetPubkey,
      owner_wallet: body.ownerWallet,
      name: body.name,
      description: body.description,
      identity_pda: agent.identityPda,
      registration_uri: agent.registrationUri,
    });

    if (dbError) {
      // The on-chain part succeeded; surface but don't fail the call
      console.error("Supabase mirror insert failed:", dbError);
    }

    return NextResponse.json({
      assetPubkey: agent.assetPubkey,
      identityPda: agent.identityPda,
      registrationUri: agent.registrationUri,
      mirrorWarning: dbError ? "supabase insert failed" : undefined,
    });
  } catch (e: any) {
    console.error("register agent failed:", e);
    return NextResponse.json(
      { error: e.message ?? String(e) },
      { status: 500 }
    );
  }
}
