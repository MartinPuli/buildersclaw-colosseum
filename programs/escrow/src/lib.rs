use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("BksBCTjhUJgZQsfqaBAFXHkLrpG537J9UCBzBguSWZHE");

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
    #[account(mut)]
    pub vault_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub winner_ata: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RefundTo<'info> {
    #[account(mut, constraint = vault.status == 0 @ EscrowError::AlreadySettled)]
    pub vault: Account<'info, PrizeVault>,
    #[account(mut)]
    pub vault_ata: Account<'info, TokenAccount>,
    #[account(mut, constraint = depositor_ata.owner == vault.depositor)]
    pub depositor_ata: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum EscrowError {
    #[msg("Not implemented yet")]
    NotImplemented,
    #[msg("Vault has already been settled")]
    AlreadySettled,
    #[msg("Authority does not match vault.authority")]
    BadAuthority,
    #[msg("Mint mismatch")]
    MintMismatch,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
}
