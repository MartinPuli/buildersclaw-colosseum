import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

import { Escrow } from "../target/types/escrow";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrow as Program<Escrow>;
  const payer = (provider.wallet as anchor.Wallet).payer;

  let mint: PublicKey;
  let depositorAta: PublicKey;
  const verdictAuthority = Keypair.generate();

  before(async () => {
    mint = await createMint(provider.connection, payer, payer.publicKey, null, 6);
    depositorAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      payer.publicKey
    );
    await mintTo(provider.connection, payer, mint, depositorAta, payer, 1_000_000_000);
  });

  it("deposit locks USDC into a PrizeVault PDA", async () => {
    const id = new anchor.BN(1);
    const amt = new anchor.BN(100_000_000); // 100 USDC
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), id.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [vaultAta] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_ata"), vaultPda.toBuffer()],
      program.programId
    );

    await program.methods
      .deposit(id, amt)
      .accounts({
        depositor: payer.publicKey,
        vault: vaultPda,
        mint,
        depositorAta,
        vaultAta,
        verdictAuthority: verdictAuthority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const v = await program.account.prizeVault.fetch(vaultPda);
    expect(v.amount.toString()).to.equal(amt.toString());
    expect(v.status).to.equal(0); // Locked
    expect(v.depositor.toString()).to.equal(payer.publicKey.toString());
    expect(v.authority.toString()).to.equal(verdictAuthority.publicKey.toString());

    const ata = await getAccount(provider.connection, vaultAta);
    expect(ata.amount.toString()).to.equal(amt.toString());
  });

  it("deposit rejects zero amount", async () => {
    const id = new anchor.BN(99);
    const amt = new anchor.BN(0);
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), id.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [vaultAta] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_ata"), vaultPda.toBuffer()],
      program.programId
    );

    let threw = false;
    try {
      await program.methods.deposit(id, amt).accounts({
        depositor: payer.publicKey, vault: vaultPda, mint, depositorAta, vaultAta,
        verdictAuthority: verdictAuthority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      }).rpc();
    } catch (e: any) {
      threw = true;
      expect(e.toString()).to.match(/ZeroAmount/);
    }
    expect(threw).to.equal(true);
  });

  it("release_to transfers vault USDC to winner with PDA-signed CPI", async () => {
    const id = new anchor.BN(2);
    const amt = new anchor.BN(50_000_000);
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), id.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [vaultAta] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_ata"), vaultPda.toBuffer()],
      program.programId
    );

    await program.methods.deposit(id, amt).accounts({
      depositor: payer.publicKey, vault: vaultPda, mint, depositorAta, vaultAta,
      verdictAuthority: verdictAuthority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    }).rpc();

    const winner = Keypair.generate();
    await provider.connection.requestAirdrop(winner.publicKey, LAMPORTS_PER_SOL);
    await new Promise((r) => setTimeout(r, 600));
    const winnerAta = await createAssociatedTokenAccount(
      provider.connection, payer, mint, winner.publicKey
    );

    await program.methods.releaseTo()
      .accounts({
        vault: vaultPda, vaultAta, winnerAta,
        authority: verdictAuthority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([verdictAuthority])
      .rpc();

    const w = await getAccount(provider.connection, winnerAta);
    expect(w.amount.toString()).to.equal(amt.toString());
    const v = await program.account.prizeVault.fetch(vaultPda);
    expect(v.status).to.equal(1); // Released
  });

  it("release_to rejects bad authority", async () => {
    const id = new anchor.BN(3);
    const amt = new anchor.BN(10_000_000);
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), id.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [vaultAta] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_ata"), vaultPda.toBuffer()],
      program.programId
    );
    await program.methods.deposit(id, amt).accounts({
      depositor: payer.publicKey, vault: vaultPda, mint, depositorAta, vaultAta,
      verdictAuthority: verdictAuthority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    }).rpc();

    const winner = Keypair.generate();
    const winnerAta = await createAssociatedTokenAccount(
      provider.connection, payer, mint, winner.publicKey
    );
    const fakeAuth = Keypair.generate();

    let threw = false;
    try {
      await program.methods.releaseTo().accounts({
        vault: vaultPda, vaultAta, winnerAta,
        authority: fakeAuth.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      }).signers([fakeAuth]).rpc();
    } catch (e: any) {
      threw = true;
      expect(e.toString()).to.match(/BadAuthority/);
    }
    expect(threw).to.equal(true);
  });

  it("refund_to returns vault to depositor", async () => {
    const id = new anchor.BN(4);
    const amt = new anchor.BN(20_000_000);
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), id.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [vaultAta] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_ata"), vaultPda.toBuffer()],
      program.programId
    );
    await program.methods.deposit(id, amt).accounts({
      depositor: payer.publicKey, vault: vaultPda, mint, depositorAta, vaultAta,
      verdictAuthority: verdictAuthority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    }).rpc();

    const before = (await getAccount(provider.connection, depositorAta)).amount;
    await program.methods.refundTo().accounts({
      vault: vaultPda, vaultAta, depositorAta,
      authority: verdictAuthority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([verdictAuthority]).rpc();
    const after = (await getAccount(provider.connection, depositorAta)).amount;

    expect((after - before).toString()).to.equal(amt.toString());
    const v = await program.account.prizeVault.fetch(vaultPda);
    expect(v.status).to.equal(2); // Refunded
  });
});
