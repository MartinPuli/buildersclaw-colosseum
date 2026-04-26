# Phase 1 — Escrow Anchor program (Days 2-3, ~12h)

Goal: deployable Anchor program with `deposit`, `release_to`, `refund_to` + tests + devnet deploy.

## Task 1.1: Define escrow accounts and errors

**Files:** `programs/escrow/Cargo.toml`, `programs/escrow/src/lib.rs`

- [ ] **Step 1: Cargo.toml**

```toml
[package]
name = "escrow"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "escrow"

[features]
no-entrypoint = []
no-idl = []
cpi = ["no-entrypoint"]
default = []
idl-build = ["anchor-lang/idl-build", "anchor-spl/idl-build"]

[dependencies]
anchor-lang = "0.30.1"
anchor-spl = { version = "0.30.1", features = ["token"] }
```

- [ ] **Step 2: Replace `programs/escrow/src/lib.rs`**

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("REPLACE_WITH_GENERATED_ID");

#[program]
pub mod escrow {
    use super::*;

    pub fn deposit(_ctx: Context<Deposit>, _hackathon_id: u64, _amount: u64) -> Result<()> {
        Err(error!(EscrowError::NotImplemented))
    }
    pub fn release_to(_ctx: Context<ReleaseTo>) -> Result<()> {
        Err(error!(EscrowError::NotImplemented))
    }
    pub fn refund_to(_ctx: Context<RefundTo>) -> Result<()> {
        Err(error!(EscrowError::NotImplemented))
    }
}

#[account]
pub struct PrizeVault {
    pub hackathon_id: u64,
    pub mint: Pubkey,
    pub amount: u64,
    pub depositor: Pubkey,
    pub authority: Pubkey,
    pub status: u8,
    pub bump: u8,
}
impl PrizeVault {
    pub const LEN: usize = 8 + 8 + 32 + 8 + 32 + 32 + 1 + 1;
}

#[derive(Accounts)]
#[instruction(hackathon_id: u64)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(init, payer = depositor, space = PrizeVault::LEN,
        seeds = [b"vault", hackathon_id.to_le_bytes().as_ref()], bump)]
    pub vault: Account<'info, PrizeVault>,
    pub mint: Account<'info, Mint>,
    #[account(mut, constraint = depositor_ata.mint == mint.key(),
        constraint = depositor_ata.owner == depositor.key())]
    pub depositor_ata: Account<'info, TokenAccount>,
    #[account(init, payer = depositor,
        seeds = [b"vault_ata", vault.key().as_ref()], bump,
        token::mint = mint, token::authority = vault)]
    pub vault_ata: Account<'info, TokenAccount>,
    /// CHECK: verdict program PDA — authority for release/refund
    pub verdict_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ReleaseTo<'info> {
    #[account(mut, constraint = vault.status == 0 @ EscrowError::AlreadySettled)]
    pub vault: Account<'info, PrizeVault>,
    #[account(mut)] pub vault_ata: Account<'info, TokenAccount>,
    #[account(mut)] pub winner_ata: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RefundTo<'info> {
    #[account(mut, constraint = vault.status == 0 @ EscrowError::AlreadySettled)]
    pub vault: Account<'info, PrizeVault>,
    #[account(mut)] pub vault_ata: Account<'info, TokenAccount>,
    #[account(mut, constraint = depositor_ata.owner == vault.depositor)]
    pub depositor_ata: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum EscrowError {
    #[msg("Not implemented yet")] NotImplemented,
    #[msg("Vault has already been settled")] AlreadySettled,
    #[msg("Authority does not match vault.authority")] BadAuthority,
    #[msg("Mint mismatch")] MintMismatch,
    #[msg("Amount must be greater than zero")] ZeroAmount,
}
```

> Replace `REPLACE_WITH_GENERATED_ID` with `solana-keygen pubkey target/deploy/escrow-keypair.json`.

- [ ] **Step 3: Build sanity** — `anchor build -p escrow`. Errors usually mean version mismatch — pin to anchor 0.30.1.
- [ ] **Step 4: Commit**

```bash
git add programs/escrow
git commit -m "feat(escrow): scaffold accounts and error types"
```

## Task 1.2: TDD `deposit`

**Files:** `tests/escrow.spec.ts`, `programs/escrow/src/lib.rs`

- [ ] **Step 1: Test (failing)** — create `tests/escrow.spec.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID, createMint, createAssociatedTokenAccount,
  mintTo, getAccount,
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
    depositorAta = await createAssociatedTokenAccount(provider.connection, payer, mint, payer.publicKey);
    await mintTo(provider.connection, payer, mint, depositorAta, payer, 1_000_000_000);
  });

  it("deposit locks USDC into a PrizeVault PDA", async () => {
    const id = new anchor.BN(1);
    const amt = new anchor.BN(100_000_000);
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), id.toArrayLike(Buffer, "le", 8)], program.programId);
    const [vaultAta] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_ata"), vaultPda.toBuffer()], program.programId);

    await program.methods.deposit(id, amt).accounts({
      depositor: payer.publicKey, vault: vaultPda, mint, depositorAta, vaultAta,
      verdictAuthority: verdictAuthority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    }).rpc();

    const v = await program.account.prizeVault.fetch(vaultPda);
    expect(v.amount.toString()).to.equal(amt.toString());
    expect(v.status).to.equal(0);
    const ata = await getAccount(provider.connection, vaultAta);
    expect(ata.amount.toString()).to.equal(amt.toString());
  });
});
```

- [ ] **Step 2: Run, expect failure** — `anchor test --skip-deploy`. Should fail with `NotImplemented`.
- [ ] **Step 3: Implement `deposit`** — replace body in `programs/escrow/src/lib.rs`:

```rust
pub fn deposit(ctx: Context<Deposit>, hackathon_id: u64, amount: u64) -> Result<()> {
    require!(amount > 0, EscrowError::ZeroAmount);
    let vault = &mut ctx.accounts.vault;
    vault.hackathon_id = hackathon_id;
    vault.mint = ctx.accounts.mint.key();
    vault.amount = amount;
    vault.depositor = ctx.accounts.depositor.key();
    vault.authority = ctx.accounts.verdict_authority.key();
    vault.status = 0;
    vault.bump = ctx.bumps.vault;

    let cpi = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.depositor_ata.to_account_info(),
            to: ctx.accounts.vault_ata.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(),
        },
    );
    token::transfer(cpi, amount)?;
    Ok(())
}
```

- [ ] **Step 4: Run, expect pass** — `anchor test --skip-deploy`.
- [ ] **Step 5: Commit**

```bash
git add programs/escrow tests/escrow.spec.ts
git commit -m "feat(escrow): implement deposit instruction"
```

## Task 1.3: TDD `release_to` (happy + bad-authority)

- [ ] **Step 1: Add tests** (append inside `describe("escrow", ...)`):

```typescript
it("release_to transfers vault USDC to winner with PDA-signed CPI", async () => {
  const id = new anchor.BN(2);
  const amt = new anchor.BN(50_000_000);
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), id.toArrayLike(Buffer, "le", 8)], program.programId);
  const [vaultAta] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_ata"), vaultPda.toBuffer()], program.programId);

  await program.methods.deposit(id, amt).accounts({
    depositor: payer.publicKey, vault: vaultPda, mint, depositorAta, vaultAta,
    verdictAuthority: verdictAuthority.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: anchor.web3.SystemProgram.programId,
    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  }).rpc();

  const winner = Keypair.generate();
  await provider.connection.requestAirdrop(winner.publicKey, LAMPORTS_PER_SOL);
  await new Promise(r => setTimeout(r, 500));
  const winnerAta = await createAssociatedTokenAccount(provider.connection, payer, mint, winner.publicKey);

  await program.methods.releaseTo().accounts({
    vault: vaultPda, vaultAta, winnerAta,
    authority: verdictAuthority.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  }).signers([verdictAuthority]).rpc();

  const w = await getAccount(provider.connection, winnerAta);
  expect(w.amount.toString()).to.equal(amt.toString());
  const v = await program.account.prizeVault.fetch(vaultPda);
  expect(v.status).to.equal(1);
});

it("release_to rejects bad authority", async () => {
  const id = new anchor.BN(3);
  const amt = new anchor.BN(10_000_000);
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), id.toArrayLike(Buffer, "le", 8)], program.programId);
  const [vaultAta] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_ata"), vaultPda.toBuffer()], program.programId);
  await program.methods.deposit(id, amt).accounts({
    depositor: payer.publicKey, vault: vaultPda, mint, depositorAta, vaultAta,
    verdictAuthority: verdictAuthority.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: anchor.web3.SystemProgram.programId,
    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  }).rpc();

  const winner = Keypair.generate();
  const winnerAta = await createAssociatedTokenAccount(provider.connection, payer, mint, winner.publicKey);
  const fake = Keypair.generate();

  let threw = false;
  try {
    await program.methods.releaseTo().accounts({
      vault: vaultPda, vaultAta, winnerAta,
      authority: fake.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([fake]).rpc();
  } catch (e: any) {
    threw = true;
    expect(e.toString()).to.match(/BadAuthority/);
  }
  expect(threw).to.equal(true);
});
```

- [ ] **Step 2: Implement `release_to`**

```rust
pub fn release_to(ctx: Context<ReleaseTo>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    require!(ctx.accounts.authority.key() == vault.authority, EscrowError::BadAuthority);
    require!(ctx.accounts.vault_ata.mint == vault.mint, EscrowError::MintMismatch);

    let id_bytes = vault.hackathon_id.to_le_bytes();
    let seeds: &[&[u8]] = &[b"vault", id_bytes.as_ref(), &[vault.bump]];
    let signer = &[seeds];

    let cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_ata.to_account_info(),
            to: ctx.accounts.winner_ata.to_account_info(),
            authority: vault.to_account_info(),
        },
        signer,
    );
    token::transfer(cpi, vault.amount)?;
    vault.status = 1;
    Ok(())
}
```

- [ ] **Step 3: Run + commit**

```bash
anchor test --skip-deploy
git add programs/escrow tests/escrow.spec.ts
git commit -m "feat(escrow): release_to with PDA-signed CPI transfer"
```

## Task 1.4: TDD `refund_to`

- [ ] **Step 1: Test**

```typescript
it("refund_to returns vault to depositor", async () => {
  const id = new anchor.BN(4);
  const amt = new anchor.BN(20_000_000);
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), id.toArrayLike(Buffer, "le", 8)], program.programId);
  const [vaultAta] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_ata"), vaultPda.toBuffer()], program.programId);
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
    authority: verdictAuthority.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
  }).signers([verdictAuthority]).rpc();
  const after = (await getAccount(provider.connection, depositorAta)).amount;
  expect((after - before).toString()).to.equal(amt.toString());
  const v = await program.account.prizeVault.fetch(vaultPda);
  expect(v.status).to.equal(2);
});
```

- [ ] **Step 2: Implement**

```rust
pub fn refund_to(ctx: Context<RefundTo>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    require!(ctx.accounts.authority.key() == vault.authority, EscrowError::BadAuthority);

    let id_bytes = vault.hackathon_id.to_le_bytes();
    let seeds: &[&[u8]] = &[b"vault", id_bytes.as_ref(), &[vault.bump]];
    let signer = &[seeds];

    let cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_ata.to_account_info(),
            to: ctx.accounts.depositor_ata.to_account_info(),
            authority: vault.to_account_info(),
        },
        signer,
    );
    token::transfer(cpi, vault.amount)?;
    vault.status = 2;
    Ok(())
}
```

- [ ] **Step 3: Run + commit**

```bash
anchor test --skip-deploy
git add programs/escrow tests/escrow.spec.ts
git commit -m "feat(escrow): refund_to instruction"
```

## Task 1.5: Deploy to devnet

- [ ] **Step 1: Deploy script**

```bash
cat > scripts/deploy-devnet.sh <<'SHELL'
#!/usr/bin/env bash
set -euo pipefail
CLUSTER="${1:-devnet}"
solana config set --url "https://api.${CLUSTER}.solana.com"
solana balance
anchor build
anchor deploy --provider.cluster "$CLUSTER"
echo
echo "escrow=$(solana-keygen pubkey target/deploy/escrow-keypair.json)"
echo "verdict=$(solana-keygen pubkey target/deploy/verdict-keypair.json)"
SHELL
chmod +x scripts/deploy-devnet.sh
```

- [ ] **Step 2: Deploy + verify**

```bash
./scripts/deploy-devnet.sh devnet
echo "https://solscan.io/account/$(solana-keygen pubkey target/deploy/escrow-keypair.json)?cluster=devnet"
```

Expected: program account visible on solscan. SOL cost: ~3-4 SOL for both programs.

- [ ] **Step 3: Commit**

```bash
git add scripts/deploy-devnet.sh
git commit -m "chore: devnet deploy script"
```
