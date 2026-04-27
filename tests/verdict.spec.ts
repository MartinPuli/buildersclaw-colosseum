import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

import { Verdict } from "../target/types/verdict";
import { Escrow } from "../target/types/escrow";

describe("verdict", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const verdictProgram = anchor.workspace.Verdict as Program<Verdict>;
  const escrowProgram = anchor.workspace.Escrow as Program<Escrow>;
  const payer = (provider.wallet as anchor.Wallet).payer;

  // Unique IDs per run so PDAs don't collide on devnet across reruns
  // Offset >> escrow's baseId so we don't collide with escrow.spec.ts either
  const baseId = Math.floor(Date.now() / 1000) + 100_000;

  const futureDeadline = () =>
    new anchor.BN(Math.floor(Date.now() / 1000) + 3600);

  it("init_hackathon creates a HackathonAccount with judges + threshold", async () => {
    const id = new anchor.BN(baseId + 1);
    const judges = [
      Keypair.generate().publicKey,
      Keypair.generate().publicKey,
      Keypair.generate().publicKey,
    ];

    const [hackPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hackathon"), id.toArrayLike(Buffer, "le", 8)],
      verdictProgram.programId
    );

    await verdictProgram.methods
      .initHackathon(id, judges, 2, futureDeadline())
      .accounts({
        sponsor: payer.publicKey,
        hackathon: hackPda,
        prizeVault: Keypair.generate().publicKey, // not enforced in v1
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const acc = await verdictProgram.account.hackathonAccount.fetch(hackPda);
    expect(acc.id.toString()).to.equal(id.toString());
    expect(acc.threshold).to.equal(2);
    expect(acc.judges.length).to.equal(3);
    expect(acc.status).to.equal(1); // Judging
    expect(acc.verdict).to.equal(null);
  });

  it("init_hackathon rejects bad threshold (zero or > judges.len)", async () => {
    const id = new anchor.BN(baseId + 2);
    const judges = [Keypair.generate().publicKey, Keypair.generate().publicKey];
    const [hackPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hackathon"), id.toArrayLike(Buffer, "le", 8)],
      verdictProgram.programId
    );

    let threw = false;
    try {
      await verdictProgram.methods
        .initHackathon(id, judges, 5, futureDeadline()) // threshold > 2
        .accounts({
          sponsor: payer.publicKey,
          hackathon: hackPda,
          prizeVault: Keypair.generate().publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch (e: any) {
      threw = true;
      expect(e.toString()).to.match(/BadThreshold/);
    }
    expect(threw).to.equal(true);
  });

  it("submit_ballot accepted from registered judge", async () => {
    const id = new anchor.BN(baseId + 3);
    const judge = Keypair.generate();
    const judges = [judge.publicKey, Keypair.generate().publicKey];

    const [hackPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hackathon"), id.toArrayLike(Buffer, "le", 8)],
      verdictProgram.programId
    );

    await verdictProgram.methods
      .initHackathon(id, judges, 1, futureDeadline())
      .accounts({
        sponsor: payer.publicKey,
        hackathon: hackPda,
        prizeVault: Keypair.generate().publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Fund the judge from payer (avoid devnet airdrop rate limits)
    const fundTx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: judge.publicKey,
        lamports: 1e8,
      })
    );
    await provider.sendAndConfirm(fundTx, [payer]);

    const winner = Keypair.generate().publicKey;
    const [ballotPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("ballot"), hackPda.toBuffer(), judge.publicKey.toBuffer()],
      verdictProgram.programId
    );

    await verdictProgram.methods
      .submitBallot(winner, Array(32).fill(7) as any, "ar://abc123")
      .accounts({
        judge: judge.publicKey,
        hackathon: hackPda,
        ballot: ballotPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([judge])
      .rpc();

    const b = await verdictProgram.account.judgeBallot.fetch(ballotPda);
    expect(b.winnerAgent.toString()).to.equal(winner.toString());
    expect(b.reasoningUri).to.equal("ar://abc123");
    expect(b.judge.toString()).to.equal(judge.publicKey.toString());
  });

  it("settle_verdict tallies ballots + CPI-releases USDC from escrow", async () => {
    const id = new anchor.BN(baseId + 4);

    // Setup: SPL mint + payer ATA with USDC
    const mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      6
    );
    const depositorAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      payer.publicKey
    );
    await mintTo(provider.connection, payer, mint, depositorAta, payer, 200_000_000);

    // Derive PDAs
    const [hackPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hackathon"), id.toArrayLike(Buffer, "le", 8)],
      verdictProgram.programId
    );
    const [verdictAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("verdict_authority"), hackPda.toBuffer()],
      verdictProgram.programId
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), id.toArrayLike(Buffer, "le", 8)],
      escrowProgram.programId
    );
    const [vaultAta] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_ata"), vaultPda.toBuffer()],
      escrowProgram.programId
    );

    // 1. Sponsor deposits prize, escrow records verdict_authority PDA as authority
    await escrowProgram.methods
      .deposit(id, new anchor.BN(100_000_000))
      .accounts({
        depositor: payer.publicKey,
        vault: vaultPda,
        mint,
        depositorAta,
        vaultAta,
        verdictAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // 2. Sponsor inits hackathon with 2 judges, threshold 2
    const judgeA = Keypair.generate();
    const judgeB = Keypair.generate();
    // Fund judges from payer (devnet airdrop is rate-limited)
    const fundTx = new anchor.web3.Transaction()
      .add(
        anchor.web3.SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: judgeA.publicKey,
          lamports: 1e8,
        })
      )
      .add(
        anchor.web3.SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: judgeB.publicKey,
          lamports: 1e8,
        })
      );
    await provider.sendAndConfirm(fundTx, [payer]);

    await verdictProgram.methods
      .initHackathon(id, [judgeA.publicKey, judgeB.publicKey], 2, futureDeadline())
      .accounts({
        sponsor: payer.publicKey,
        hackathon: hackPda,
        prizeVault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // 3. Both judges vote for the same winner
    const winnerOwner = Keypair.generate();
    const winnerAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      winnerOwner.publicKey
    );

    const ballotPdas: PublicKey[] = [];
    for (const judge of [judgeA, judgeB]) {
      const [ballotPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("ballot"), hackPda.toBuffer(), judge.publicKey.toBuffer()],
        verdictProgram.programId
      );
      ballotPdas.push(ballotPda);
      await verdictProgram.methods
        .submitBallot(winnerOwner.publicKey, Array(32).fill(0) as any, "ar://x")
        .accounts({
          judge: judge.publicKey,
          hackathon: hackPda,
          ballot: ballotPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([judge])
        .rpc();
    }

    // 4. Settle — pass ballots as remainingAccounts, expect CPI to escrow.release_to
    await verdictProgram.methods
      .settleVerdict()
      .accounts({
        caller: payer.publicKey,
        hackathon: hackPda,
        verdictAuthority,
        prizeVault: vaultPda,
        vaultAta,
        winnerAta,
        escrowProgram: escrowProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(
        ballotPdas.map((p) => ({ pubkey: p, isSigner: false, isWritable: false }))
      )
      .rpc();

    // 5. Assertions
    const winnerAccount = await getAccount(provider.connection, winnerAta);
    expect(winnerAccount.amount.toString()).to.equal("100000000");

    const hack = await verdictProgram.account.hackathonAccount.fetch(hackPda);
    expect(hack.status).to.equal(2); // Settled
    expect(hack.verdict?.toString()).to.equal(winnerOwner.publicKey.toString());

    const vault = await escrowProgram.account.prizeVault.fetch(vaultPda);
    expect(vault.status).to.equal(1); // Released
  });
});
