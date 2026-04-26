import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import escrowIdl from "./idl/escrow.json" with { type: "json" };
import type { Escrow } from "./idl/escrow.js";

export interface EscrowDepositParams {
  hackathonId: bigint;
  amount: bigint;
  mint: PublicKey;
  depositorAta: PublicKey;
  verdictAuthority: PublicKey;
}

/**
 * Client for the BuildersClaw escrow Anchor program.
 *
 *   - vaultPda(id):     PDA for the PrizeVault account
 *   - vaultAtaPda(v):   PDA for the vault's USDC ATA
 *   - deposit():        compose + send the deposit tx
 *
 * The verdict_authority must be the verdict program's verdict_authority PDA
 * for that hackathon, otherwise settle_verdict won't be able to release.
 */
export class EscrowClient {
  readonly program: Program<Escrow>;

  constructor(connection: Connection, payer: Keypair) {
    const wallet = new anchor.Wallet(payer);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    this.program = new Program<Escrow>(escrowIdl as any, provider);
  }

  vaultPda(id: bigint): [PublicKey, number] {
    const bn = new anchor.BN(id.toString());
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), bn.toArrayLike(Buffer, "le", 8)],
      this.program.programId
    );
  }

  vaultAtaPda(vault: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault_ata"), vault.toBuffer()],
      this.program.programId
    );
  }

  async deposit(p: EscrowDepositParams): Promise<string> {
    const [vault] = this.vaultPda(p.hackathonId);
    const [vaultAta] = this.vaultAtaPda(vault);
    return this.program.methods
      .deposit(
        new anchor.BN(p.hackathonId.toString()),
        new anchor.BN(p.amount.toString())
      )
      .accountsPartial({
        depositor: this.program.provider.publicKey!,
        vault,
        mint: p.mint,
        depositorAta: p.depositorAta,
        vaultAta,
        verdictAuthority: p.verdictAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  }
}
