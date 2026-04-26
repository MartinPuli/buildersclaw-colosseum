import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import verdictIdl from "./idl/verdict.json" with { type: "json" };
import type { Verdict } from "./idl/verdict.js";

/**
 * Client for the BuildersClaw verdict Anchor program.
 *
 * PDA helpers:
 *   - hackathonPda(id):         the HackathonAccount
 *   - ballotPda(hack, judge):   per-judge JudgeBallot
 *   - verdictAuthorityPda(hack): PDA that signs the CPI to escrow.release_to
 *
 * Methods:
 *   - initHackathon(...):  sponsor seeds the hackathon
 *   - submitBallot(...):   judge posts a ballot (judge keypair signs)
 *   - settleVerdict(...):  anyone can call once threshold reached;
 *                          tallies ballots passed as remainingAccounts and
 *                          CPI-releases USDC to the winner
 */
export class VerdictClient {
  readonly program: Program<Verdict>;

  constructor(connection: Connection, payer: Keypair) {
    const wallet = new anchor.Wallet(payer);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    this.program = new Program<Verdict>(verdictIdl as any, provider);
  }

  hackathonPda(id: bigint): [PublicKey, number] {
    const bn = new anchor.BN(id.toString());
    return PublicKey.findProgramAddressSync(
      [Buffer.from("hackathon"), bn.toArrayLike(Buffer, "le", 8)],
      this.program.programId
    );
  }

  ballotPda(hackathon: PublicKey, judge: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("ballot"), hackathon.toBuffer(), judge.toBuffer()],
      this.program.programId
    );
  }

  verdictAuthorityPda(hackathon: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("verdict_authority"), hackathon.toBuffer()],
      this.program.programId
    );
  }

  async initHackathon(opts: {
    id: bigint;
    judges: PublicKey[];
    threshold: number;
    deadline: number;
    prizeVault: PublicKey;
  }): Promise<string> {
    const [hackathon] = this.hackathonPda(opts.id);
    return this.program.methods
      .initHackathon(
        new anchor.BN(opts.id.toString()),
        opts.judges,
        opts.threshold,
        new anchor.BN(opts.deadline)
      )
      .accountsPartial({
        sponsor: this.program.provider.publicKey!,
        hackathon,
        prizeVault: opts.prizeVault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  }

  async submitBallot(opts: {
    hackathonId: bigint;
    judge: Keypair;
    winnerAgent: PublicKey;
    scoreRoot: number[];
    reasoningUri: string;
  }): Promise<string> {
    const [hackathon] = this.hackathonPda(opts.hackathonId);
    const [ballot] = this.ballotPda(hackathon, opts.judge.publicKey);
    return this.program.methods
      .submitBallot(opts.winnerAgent, opts.scoreRoot as any, opts.reasoningUri)
      .accountsPartial({
        judge: opts.judge.publicKey,
        hackathon,
        ballot,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([opts.judge])
      .rpc();
  }

  async settleVerdict(opts: {
    hackathonId: bigint;
    prizeVault: PublicKey;
    vaultAta: PublicKey;
    winnerAta: PublicKey;
    escrowProgramId: PublicKey;
    ballotPdas: PublicKey[];
  }): Promise<string> {
    const [hackathon] = this.hackathonPda(opts.hackathonId);
    const [verdictAuthority] = this.verdictAuthorityPda(hackathon);
    return this.program.methods
      .settleVerdict()
      .accountsPartial({
        caller: this.program.provider.publicKey!,
        hackathon,
        verdictAuthority,
        prizeVault: opts.prizeVault,
        vaultAta: opts.vaultAta,
        winnerAta: opts.winnerAta,
        escrowProgram: opts.escrowProgramId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(
        opts.ballotPdas.map((p) => ({
          pubkey: p,
          isSigner: false,
          isWritable: false,
        }))
      )
      .rpc();
  }
}
