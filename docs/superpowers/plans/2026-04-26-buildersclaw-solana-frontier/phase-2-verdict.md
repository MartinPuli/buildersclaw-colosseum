# Phase 2 — Verdict Anchor program (Days 3-5, ~16h)

Goal: deployable verdict program with judge ballots, settlement, CPI to escrow.

## Task 2.1: Define verdict accounts + escrow CPI dependency

**Files:** `programs/verdict/Cargo.toml`, `programs/verdict/src/lib.rs`

- [ ] **Step 1: Cargo.toml**

```toml
[package]
name = "verdict"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "verdict"

[features]
no-entrypoint = []
no-idl = []
cpi = ["no-entrypoint"]
default = []
idl-build = ["anchor-lang/idl-build"]

[dependencies]
anchor-lang = "0.30.1"
anchor-spl = { version = "0.30.1", features = ["token"] }
escrow = { path = "../escrow", features = ["cpi"] }
```

- [ ] **Step 2: Replace `programs/verdict/src/lib.rs`**

```rust
use anchor_lang::prelude::*;

declare_id!("REPLACE_WITH_GENERATED_ID");

pub const MAX_JUDGES: usize = 7;
pub const MAX_REASONING_URI: usize = 200;
pub const GRACE_PERIOD_SECS: i64 = 60 * 60 * 6;

#[program]
pub mod verdict {
    use super::*;
    pub fn init_hackathon(_ctx: Context<InitHackathon>, _id: u64,
        _judges: Vec<Pubkey>, _threshold: u8, _deadline: i64) -> Result<()> {
        Err(error!(VerdictError::NotImplemented))
    }
    pub fn submit_ballot(_ctx: Context<SubmitBallot>, _winner: Pubkey,
        _root: [u8; 32], _uri: String) -> Result<()> {
        Err(error!(VerdictError::NotImplemented))
    }
    pub fn settle_verdict(_ctx: Context<SettleVerdict>) -> Result<()> {
        Err(error!(VerdictError::NotImplemented))
    }
    pub fn mark_refundable(_ctx: Context<MarkRefundable>) -> Result<()> {
        Err(error!(VerdictError::NotImplemented))
    }
}

#[account]
pub struct HackathonAccount {
    pub id: u64, pub sponsor: Pubkey, pub prize_vault: Pubkey,
    pub judges: Vec<Pubkey>, pub threshold: u8, pub deadline: i64,
    pub status: u8, pub verdict: Option<Pubkey>, pub bump: u8,
}
impl HackathonAccount {
    pub const LEN: usize = 8 + 8 + 32 + 32 + 4 + (32 * MAX_JUDGES) + 1 + 8 + 1 + 1 + 32 + 1;
}

#[account]
pub struct JudgeBallot {
    pub hackathon: Pubkey, pub judge: Pubkey, pub winner_agent: Pubkey,
    pub score_root: [u8; 32], pub reasoning_uri: String,
    pub signed_at: i64, pub bump: u8,
}
impl JudgeBallot {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 4 + MAX_REASONING_URI + 8 + 1;
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct InitHackathon<'info> {
    #[account(mut)] pub sponsor: Signer<'info>,
    #[account(init, payer = sponsor, space = HackathonAccount::LEN,
        seeds = [b"hackathon", id.to_le_bytes().as_ref()], bump)]
    pub hackathon: Account<'info, HackathonAccount>,
    /// CHECK: prize vault from escrow
    pub prize_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitBallot<'info> {
    #[account(mut)] pub judge: Signer<'info>,
    #[account(mut)] pub hackathon: Account<'info, HackathonAccount>,
    #[account(init_if_needed, payer = judge, space = JudgeBallot::LEN,
        seeds = [b"ballot", hackathon.key().as_ref(), judge.key().as_ref()], bump)]
    pub ballot: Account<'info, JudgeBallot>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleVerdict<'info> {
    #[account(mut)] pub caller: Signer<'info>,
    #[account(mut, constraint = hackathon.status != 2 @ VerdictError::AlreadySettled)]
    pub hackathon: Account<'info, HackathonAccount>,
    /// CHECK: PDA derived; serves as escrow authority
    #[account(seeds = [b"verdict_authority", hackathon.key().as_ref()], bump)]
    pub verdict_authority: UncheckedAccount<'info>,
    /// CHECK: vault from escrow
    #[account(mut)] pub prize_vault: UncheckedAccount<'info>,
    /// CHECK: vault ATA from escrow
    #[account(mut)] pub vault_ata: UncheckedAccount<'info>,
    /// CHECK: winner's USDC ATA
    #[account(mut)] pub winner_ata: UncheckedAccount<'info>,
    pub escrow_program: Program<'info, Escrow>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
}

#[derive(Accounts)]
pub struct MarkRefundable<'info> {
    #[account(mut)] pub caller: Signer<'info>,
    #[account(mut, constraint = hackathon.status == 1 @ VerdictError::WrongStatus)]
    pub hackathon: Account<'info, HackathonAccount>,
}

#[derive(Clone)]
pub struct Escrow;
impl anchor_lang::Id for Escrow {
    fn id() -> Pubkey { escrow::ID }
}

#[error_code]
pub enum VerdictError {
    #[msg("Not implemented")] NotImplemented,
    #[msg("Already settled")] AlreadySettled,
    #[msg("Wrong status")] WrongStatus,
    #[msg("Caller is not in the judges list")] NotAJudge,
    #[msg("Threshold not reached for any single winner")] ThresholdNotReached,
    #[msg("Reasoning URI exceeds max length")] ReasoningTooLong,
    #[msg("Too many judges (max 7)")] TooManyJudges,
    #[msg("Threshold must be > 0 and <= judges.len()")] BadThreshold,
    #[msg("Deadline must be in the future")] BadDeadline,
    #[msg("Deadline + grace period not yet reached")] GracePeriodActive,
}
```

- [ ] **Step 3: Build sanity + commit** — `anchor build`. Then:

```bash
git add programs/verdict
git commit -m "feat(verdict): scaffold accounts, errors, and escrow CPI dependency"
```

## Task 2.2: TDD `init_hackathon`

- [ ] **Step 1: Test** — create `tests/verdict.spec.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { Verdict } from "../target/types/verdict";

describe("verdict::init_hackathon", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Verdict as Program<Verdict>;

  it("creates a HackathonAccount", async () => {
    const id = new anchor.BN(100);
    const sponsor = (provider.wallet as anchor.Wallet).payer;
    const judges = [Keypair.generate().publicKey, Keypair.generate().publicKey, Keypair.generate().publicKey];
    const deadline = new anchor.BN(Math.floor(Date.now()/1000) + 3600);

    const [hackPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hackathon"), id.toArrayLike(Buffer, "le", 8)], program.programId);

    await program.methods.initHackathon(id, judges, 2, deadline).accounts({
      sponsor: sponsor.publicKey, hackathon: hackPda,
      prizeVault: Keypair.generate().publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    const acc = await program.account.hackathonAccount.fetch(hackPda);
    expect(acc.threshold).to.equal(2);
    expect(acc.judges.length).to.equal(3);
    expect(acc.status).to.equal(1);
  });
});
```

- [ ] **Step 2: Implement**

```rust
pub fn init_hackathon(
    ctx: Context<InitHackathon>, id: u64,
    judges: Vec<Pubkey>, threshold: u8, deadline: i64,
) -> Result<()> {
    require!(judges.len() <= MAX_JUDGES, VerdictError::TooManyJudges);
    require!(threshold > 0 && (threshold as usize) <= judges.len(), VerdictError::BadThreshold);
    let now = Clock::get()?.unix_timestamp;
    require!(deadline > now, VerdictError::BadDeadline);

    let h = &mut ctx.accounts.hackathon;
    h.id = id;
    h.sponsor = ctx.accounts.sponsor.key();
    h.prize_vault = ctx.accounts.prize_vault.key();
    h.judges = judges;
    h.threshold = threshold;
    h.deadline = deadline;
    h.status = 1;
    h.verdict = None;
    h.bump = ctx.bumps.hackathon;
    Ok(())
}
```

- [ ] **Step 3: Run + commit**

```bash
anchor test --skip-deploy
git add programs/verdict tests/verdict.spec.ts
git commit -m "feat(verdict): init_hackathon"
```

## Task 2.3: TDD `submit_ballot`

- [ ] **Step 1: Tests** (append):

```typescript
describe("verdict::submit_ballot", () => {
  it("registered judge can submit", async () => {
    const id = new anchor.BN(101);
    const sponsor = (provider.wallet as anchor.Wallet).payer;
    const judge = Keypair.generate();
    await provider.connection.requestAirdrop(judge.publicKey, 1e9);
    await new Promise(r => setTimeout(r, 500));
    const judges = [judge.publicKey, Keypair.generate().publicKey];
    const deadline = new anchor.BN(Math.floor(Date.now()/1000) + 3600);

    const [hackPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hackathon"), id.toArrayLike(Buffer, "le", 8)], program.programId);
    await program.methods.initHackathon(id, judges, 1, deadline).accounts({
      sponsor: sponsor.publicKey, hackathon: hackPda,
      prizeVault: Keypair.generate().publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    const winner = Keypair.generate().publicKey;
    const [ballotPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("ballot"), hackPda.toBuffer(), judge.publicKey.toBuffer()], program.programId);
    await program.methods.submitBallot(winner, Array(32).fill(7) as any, "ar://abc").accounts({
      judge: judge.publicKey, hackathon: hackPda, ballot: ballotPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([judge]).rpc();

    const b = await program.account.judgeBallot.fetch(ballotPda);
    expect(b.winnerAgent.toString()).to.equal(winner.toString());
    expect(b.reasoningUri).to.equal("ar://abc");
  });

  it("non-judge is rejected", async () => {
    const id = new anchor.BN(102);
    const sponsor = (provider.wallet as anchor.Wallet).payer;
    const realJudge = Keypair.generate();
    const deadline = new anchor.BN(Math.floor(Date.now()/1000) + 3600);
    const [hackPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hackathon"), id.toArrayLike(Buffer, "le", 8)], program.programId);
    await program.methods.initHackathon(id, [realJudge.publicKey], 1, deadline).accounts({
      sponsor: sponsor.publicKey, hackathon: hackPda,
      prizeVault: Keypair.generate().publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    const fake = Keypair.generate();
    await provider.connection.requestAirdrop(fake.publicKey, 1e9);
    await new Promise(r => setTimeout(r, 500));
    const [ballotPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("ballot"), hackPda.toBuffer(), fake.publicKey.toBuffer()], program.programId);

    let threw = false;
    try {
      await program.methods.submitBallot(Keypair.generate().publicKey, Array(32).fill(0) as any, "ar://x").accounts({
        judge: fake.publicKey, hackathon: hackPda, ballot: ballotPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([fake]).rpc();
    } catch (e: any) {
      threw = true;
      expect(e.toString()).to.match(/NotAJudge/);
    }
    expect(threw).to.equal(true);
  });
});
```

- [ ] **Step 2: Implement**

```rust
pub fn submit_ballot(
    ctx: Context<SubmitBallot>, winner_agent: Pubkey,
    score_root: [u8; 32], reasoning_uri: String,
) -> Result<()> {
    require!(reasoning_uri.len() <= MAX_REASONING_URI, VerdictError::ReasoningTooLong);
    let h = &ctx.accounts.hackathon;
    require!(h.status == 1, VerdictError::WrongStatus);
    require!(h.judges.iter().any(|j| j == &ctx.accounts.judge.key()), VerdictError::NotAJudge);

    let b = &mut ctx.accounts.ballot;
    b.hackathon = ctx.accounts.hackathon.key();
    b.judge = ctx.accounts.judge.key();
    b.winner_agent = winner_agent;
    b.score_root = score_root;
    b.reasoning_uri = reasoning_uri;
    b.signed_at = Clock::get()?.unix_timestamp;
    b.bump = ctx.bumps.ballot;
    Ok(())
}
```

- [ ] **Step 3: Run + commit**

```bash
anchor test --skip-deploy
git add programs/verdict tests/verdict.spec.ts
git commit -m "feat(verdict): submit_ballot with judges-list check"
```

## Task 2.4: TDD `settle_verdict` with CPI to escrow

- [ ] **Step 1: Test** — full flow: deposit → 2 ballots → settle releases USDC

```typescript
import {
  TOKEN_PROGRAM_ID, createMint, createAssociatedTokenAccount, mintTo, getAccount,
} from "@solana/spl-token";
import { Escrow } from "../target/types/escrow";

describe("verdict::settle_verdict", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const verdictProgram = anchor.workspace.Verdict as Program<Verdict>;
  const escrowProgram = anchor.workspace.Escrow as Program<Escrow>;
  const payer = (provider.wallet as anchor.Wallet).payer;

  it("settles when threshold reached", async () => {
    const id = new anchor.BN(200);
    const mint = await createMint(provider.connection, payer, payer.publicKey, null, 6);
    const depositorAta = await createAssociatedTokenAccount(provider.connection, payer, mint, payer.publicKey);
    await mintTo(provider.connection, payer, mint, depositorAta, payer, 200_000_000);

    const [hackPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hackathon"), id.toArrayLike(Buffer, "le", 8)], verdictProgram.programId);
    const [verdictAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("verdict_authority"), hackPda.toBuffer()], verdictProgram.programId);

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), id.toArrayLike(Buffer, "le", 8)], escrowProgram.programId);
    const [vaultAta] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_ata"), vaultPda.toBuffer()], escrowProgram.programId);

    await escrowProgram.methods.deposit(id, new anchor.BN(100_000_000)).accounts({
      depositor: payer.publicKey, vault: vaultPda, mint, depositorAta, vaultAta,
      verdictAuthority,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    }).rpc();

    const judgeA = Keypair.generate();
    const judgeB = Keypair.generate();
    for (const k of [judgeA, judgeB]) await provider.connection.requestAirdrop(k.publicKey, 1e9);
    await new Promise(r => setTimeout(r, 800));

    const deadline = new anchor.BN(Math.floor(Date.now()/1000) + 3600);
    await verdictProgram.methods.initHackathon(id, [judgeA.publicKey, judgeB.publicKey], 2, deadline).accounts({
      sponsor: payer.publicKey, hackathon: hackPda,
      prizeVault: vaultPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    const winnerAgent = Keypair.generate().publicKey;
    const winner = Keypair.generate();
    await provider.connection.requestAirdrop(winner.publicKey, 1e9);
    await new Promise(r => setTimeout(r, 500));
    const winnerAta = await createAssociatedTokenAccount(provider.connection, payer, mint, winner.publicKey);

    for (const judge of [judgeA, judgeB]) {
      const [ballot] = PublicKey.findProgramAddressSync(
        [Buffer.from("ballot"), hackPda.toBuffer(), judge.publicKey.toBuffer()], verdictProgram.programId);
      await verdictProgram.methods.submitBallot(winnerAgent, Array(32).fill(0) as any, "ar://x").accounts({
        judge: judge.publicKey, hackathon: hackPda, ballot,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([judge]).rpc();
    }

    const ballotPdas = [judgeA, judgeB].map(j => PublicKey.findProgramAddressSync(
      [Buffer.from("ballot"), hackPda.toBuffer(), j.publicKey.toBuffer()], verdictProgram.programId)[0]);

    await verdictProgram.methods.settleVerdict().accounts({
      caller: payer.publicKey, hackathon: hackPda, verdictAuthority,
      prizeVault: vaultPda, vaultAta, winnerAta,
      escrowProgram: escrowProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).remainingAccounts(ballotPdas.map(p => ({ pubkey: p, isSigner: false, isWritable: false }))).rpc();

    const w = await getAccount(provider.connection, winnerAta);
    expect(w.amount.toString()).to.equal("100000000");
    const hack = await verdictProgram.account.hackathonAccount.fetch(hackPda);
    expect(hack.status).to.equal(2);
    expect(hack.verdict?.toString()).to.equal(winnerAgent.toString());
  });
});
```

- [ ] **Step 2: Implement**

```rust
pub fn settle_verdict(ctx: Context<SettleVerdict>) -> Result<()> {
    let h = &mut ctx.accounts.hackathon;
    require!(h.status == 1, VerdictError::WrongStatus);

    let mut tally: std::collections::BTreeMap<Pubkey, u8> = std::collections::BTreeMap::new();
    for acc_info in ctx.remaining_accounts.iter() {
        let ballot: Account<JudgeBallot> = Account::try_from(acc_info)?;
        require!(ballot.hackathon == h.key(), VerdictError::WrongStatus);
        require!(h.judges.iter().any(|j| j == &ballot.judge), VerdictError::NotAJudge);
        *tally.entry(ballot.winner_agent).or_insert(0) += 1;
    }

    let (&winner, &votes) = tally.iter().max_by_key(|(_, v)| *v)
        .ok_or(error!(VerdictError::ThresholdNotReached))?;
    require!(votes >= h.threshold, VerdictError::ThresholdNotReached);
    let ties = tally.values().filter(|&&v| v == votes).count();
    require!(ties == 1, VerdictError::ThresholdNotReached);

    h.verdict = Some(winner);
    h.status = 2;

    let h_key = h.key();
    let bump = ctx.bumps.verdict_authority;
    let seeds: &[&[u8]] = &[b"verdict_authority", h_key.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    let cpi_program = ctx.accounts.escrow_program.to_account_info();
    let cpi_accounts = escrow::cpi::accounts::ReleaseTo {
        vault: ctx.accounts.prize_vault.to_account_info(),
        vault_ata: ctx.accounts.vault_ata.to_account_info(),
        winner_ata: ctx.accounts.winner_ata.to_account_info(),
        authority: ctx.accounts.verdict_authority.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    escrow::cpi::release_to(CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds))?;
    Ok(())
}
```

- [ ] **Step 3: Run + commit**

```bash
anchor test --skip-deploy
git add programs/verdict tests/verdict.spec.ts
git commit -m "feat(verdict): settle_verdict tallies ballots and CPI-releases escrow"
```

## Task 2.5: Implement `mark_refundable`

```rust
pub fn mark_refundable(ctx: Context<MarkRefundable>) -> Result<()> {
    let h = &mut ctx.accounts.hackathon;
    let now = Clock::get()?.unix_timestamp;
    require!(now >= h.deadline.saturating_add(GRACE_PERIOD_SECS), VerdictError::GracePeriodActive);
    h.status = 3;
    Ok(())
}
```

```bash
anchor test --skip-deploy
git add programs/verdict tests/verdict.spec.ts
git commit -m "feat(verdict): mark_refundable after grace period"
```

## Task 2.6: Deploy verdict to devnet

```bash
./scripts/deploy-devnet.sh devnet
anchor test --provider.cluster devnet --skip-deploy
git add . && git diff --cached --quiet || git commit -m "chore: devnet deploy + smoke pass"
```
