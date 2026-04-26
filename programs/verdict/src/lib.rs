use anchor_lang::prelude::*;

declare_id!("FPp9mSTjVPXgyVMowMj6zETk9PQdNPMTkFMscetjAdKm");

pub const MAX_JUDGES: usize = 7;
pub const MAX_REASONING_URI: usize = 200;
pub const GRACE_PERIOD_SECS: i64 = 60 * 60 * 6;

#[program]
pub mod verdict {
    use super::*;

    pub fn init_hackathon(
        ctx: Context<InitHackathon>,
        id: u64,
        judges: Vec<Pubkey>,
        threshold: u8,
        deadline: i64,
    ) -> Result<()> {
        require!(judges.len() <= MAX_JUDGES, VerdictError::TooManyJudges);
        require!(
            threshold > 0 && (threshold as usize) <= judges.len(),
            VerdictError::BadThreshold
        );
        let now = Clock::get()?.unix_timestamp;
        require!(deadline > now, VerdictError::BadDeadline);

        let h = &mut ctx.accounts.hackathon;
        h.id = id;
        h.sponsor = ctx.accounts.sponsor.key();
        h.prize_vault = ctx.accounts.prize_vault.key();
        h.judges = judges;
        h.threshold = threshold;
        h.deadline = deadline;
        h.status = 1; // Judging
        h.verdict = None;
        h.bump = ctx.bumps.hackathon;
        Ok(())
    }

    pub fn submit_ballot(
        ctx: Context<SubmitBallot>,
        winner_agent: Pubkey,
        score_root: [u8; 32],
        reasoning_uri: String,
    ) -> Result<()> {
        require!(
            reasoning_uri.len() <= MAX_REASONING_URI,
            VerdictError::ReasoningTooLong
        );
        let h = &ctx.accounts.hackathon;
        require!(h.status == 1, VerdictError::WrongStatus);
        require!(
            h.judges.iter().any(|j| j == &ctx.accounts.judge.key()),
            VerdictError::NotAJudge
        );

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

    pub fn settle_verdict(ctx: Context<SettleVerdict>) -> Result<()> {
        let h = &mut ctx.accounts.hackathon;
        require!(h.status == 1, VerdictError::WrongStatus);

        // Tally ballots passed as remaining_accounts
        let mut tally: std::collections::BTreeMap<Pubkey, u8> = std::collections::BTreeMap::new();
        for acc_info in ctx.remaining_accounts.iter() {
            let ballot: Account<JudgeBallot> = Account::try_from(acc_info)?;
            require!(ballot.hackathon == h.key(), VerdictError::WrongStatus);
            require!(
                h.judges.iter().any(|j| j == &ballot.judge),
                VerdictError::NotAJudge
            );
            *tally.entry(ballot.winner_agent).or_insert(0) += 1;
        }

        let (&winner, &votes) = tally
            .iter()
            .max_by_key(|(_, v)| *v)
            .ok_or(error!(VerdictError::ThresholdNotReached))?;
        require!(votes >= h.threshold, VerdictError::ThresholdNotReached);
        // Reject ties — must be a single winner with the max
        let ties = tally.values().filter(|&&v| v == votes).count();
        require!(ties == 1, VerdictError::ThresholdNotReached);

        h.verdict = Some(winner);
        h.status = 2; // Settled

        // CPI to escrow::release_to with verdict_authority PDA as signer
        let h_key = h.key();
        let bump = ctx.bumps.verdict_authority;
        let seeds: &[&[u8]] = &[b"verdict_authority", h_key.as_ref(), &[bump]];
        let signer_seeds = &[seeds];

        let cpi_program = ctx.accounts.escrow_program.key();
        let cpi_accounts = escrow::cpi::accounts::ReleaseTo {
            vault: ctx.accounts.prize_vault.to_account_info(),
            vault_ata: ctx.accounts.vault_ata.to_account_info(),
            winner_ata: ctx.accounts.winner_ata.to_account_info(),
            authority: ctx.accounts.verdict_authority.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        escrow::cpi::release_to(CpiContext::new_with_signer(
            cpi_program,
            cpi_accounts,
            signer_seeds,
        ))?;
        Ok(())
    }

    pub fn mark_refundable(ctx: Context<MarkRefundable>) -> Result<()> {
        let h = &mut ctx.accounts.hackathon;
        let now = Clock::get()?.unix_timestamp;
        require!(
            now >= h.deadline.saturating_add(GRACE_PERIOD_SECS),
            VerdictError::GracePeriodActive
        );
        h.status = 3; // Refundable
        Ok(())
    }
}

#[account]
pub struct HackathonAccount {
    pub id: u64,
    pub sponsor: Pubkey,
    pub prize_vault: Pubkey,
    pub judges: Vec<Pubkey>,
    pub threshold: u8,
    pub deadline: i64,
    pub status: u8,
    pub verdict: Option<Pubkey>,
    pub bump: u8,
}
impl HackathonAccount {
    pub const LEN: usize = 8 + 8 + 32 + 32 + 4 + (32 * MAX_JUDGES) + 1 + 8 + 1 + 1 + 32 + 1;
}

#[account]
pub struct JudgeBallot {
    pub hackathon: Pubkey,
    pub judge: Pubkey,
    pub winner_agent: Pubkey,
    pub score_root: [u8; 32],
    pub reasoning_uri: String,
    pub signed_at: i64,
    pub bump: u8,
}
impl JudgeBallot {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 4 + MAX_REASONING_URI + 8 + 1;
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct InitHackathon<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,
    #[account(init, payer = sponsor, space = HackathonAccount::LEN,
        seeds = [b"hackathon", id.to_le_bytes().as_ref()], bump)]
    pub hackathon: Account<'info, HackathonAccount>,
    /// CHECK: prize vault from escrow
    pub prize_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitBallot<'info> {
    #[account(mut)]
    pub judge: Signer<'info>,
    #[account(mut)]
    pub hackathon: Account<'info, HackathonAccount>,
    #[account(init_if_needed, payer = judge, space = JudgeBallot::LEN,
        seeds = [b"ballot", hackathon.key().as_ref(), judge.key().as_ref()], bump)]
    pub ballot: Account<'info, JudgeBallot>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleVerdict<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut, constraint = hackathon.status != 2 @ VerdictError::AlreadySettled)]
    pub hackathon: Account<'info, HackathonAccount>,
    /// CHECK: PDA derived; serves as escrow authority
    #[account(seeds = [b"verdict_authority", hackathon.key().as_ref()], bump)]
    pub verdict_authority: UncheckedAccount<'info>,
    /// CHECK: vault from escrow
    #[account(mut)]
    pub prize_vault: UncheckedAccount<'info>,
    /// CHECK: vault ATA from escrow
    #[account(mut)]
    pub vault_ata: UncheckedAccount<'info>,
    /// CHECK: winner's USDC ATA
    #[account(mut)]
    pub winner_ata: UncheckedAccount<'info>,
    pub escrow_program: Program<'info, Escrow>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
}

#[derive(Accounts)]
pub struct MarkRefundable<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut, constraint = hackathon.status == 1 @ VerdictError::WrongStatus)]
    pub hackathon: Account<'info, HackathonAccount>,
}

#[derive(Clone)]
pub struct Escrow;
impl anchor_lang::Id for Escrow {
    fn id() -> Pubkey {
        escrow::ID
    }
}

#[error_code]
pub enum VerdictError {
    #[msg("Not implemented")]
    NotImplemented,
    #[msg("Already settled")]
    AlreadySettled,
    #[msg("Wrong status")]
    WrongStatus,
    #[msg("Caller is not in the judges list")]
    NotAJudge,
    #[msg("Threshold not reached for any single winner")]
    ThresholdNotReached,
    #[msg("Reasoning URI exceeds max length")]
    ReasoningTooLong,
    #[msg("Too many judges (max 7)")]
    TooManyJudges,
    #[msg("Threshold must be > 0 and <= judges.len()")]
    BadThreshold,
    #[msg("Deadline must be in the future")]
    BadDeadline,
    #[msg("Deadline + grace period not yet reached")]
    GracePeriodActive,
}
