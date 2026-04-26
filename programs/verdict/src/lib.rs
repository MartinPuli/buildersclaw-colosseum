use anchor_lang::prelude::*;

declare_id!("FPp9mSTjVPXgyVMowMj6zETk9PQdNPMTkFMscetjAdKm");

pub const MAX_JUDGES: usize = 7;
pub const MAX_REASONING_URI: usize = 200;
pub const GRACE_PERIOD_SECS: i64 = 60 * 60 * 6;

#[program]
pub mod verdict {
    use super::*;

    pub fn init_hackathon(
        _ctx: Context<InitHackathon>,
        _id: u64,
        _judges: Vec<Pubkey>,
        _threshold: u8,
        _deadline: i64,
    ) -> Result<()> {
        Err(error!(VerdictError::NotImplemented))
    }
    pub fn submit_ballot(
        _ctx: Context<SubmitBallot>,
        _winner: Pubkey,
        _root: [u8; 32],
        _uri: String,
    ) -> Result<()> {
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
