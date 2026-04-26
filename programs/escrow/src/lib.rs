use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("BksBCTjhUJgZQsfqaBAFXHkLrpG537J9UCBzBguSWZHE");

#[program]
pub mod escrow {
    use super::*;

    pub fn deposit(ctx: Context<Deposit>, hackathon_id: u64, amount: u64) -> Result<()> {
        require!(amount > 0, EscrowError::ZeroAmount);

        let vault = &mut ctx.accounts.vault;
        vault.hackathon_id = hackathon_id;
        vault.mint = ctx.accounts.mint.key();
        vault.amount = amount;
        vault.depositor = ctx.accounts.depositor.key();
        vault.authority = ctx.accounts.verdict_authority.key();
        vault.status = 0; // Locked
        vault.bump = ctx.bumps.vault;

        let cpi = CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.depositor_ata.to_account_info(),
                to: ctx.accounts.vault_ata.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        );
        token::transfer(cpi, amount)?;
        Ok(())
    }

    pub fn release_to(ctx: Context<ReleaseTo>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(
            ctx.accounts.authority.key() == vault.authority,
            EscrowError::BadAuthority
        );
        require!(
            ctx.accounts.vault_ata.mint == vault.mint,
            EscrowError::MintMismatch
        );

        let id_bytes = vault.hackathon_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"vault", id_bytes.as_ref(), &[vault.bump]];
        let signer = &[seeds];

        let cpi = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.vault_ata.to_account_info(),
                to: ctx.accounts.winner_ata.to_account_info(),
                authority: vault.to_account_info(),
            },
            signer,
        );
        token::transfer(cpi, vault.amount)?;
        vault.status = 1; // Released
        Ok(())
    }

    pub fn refund_to(ctx: Context<RefundTo>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(
            ctx.accounts.authority.key() == vault.authority,
            EscrowError::BadAuthority
        );

        let id_bytes = vault.hackathon_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"vault", id_bytes.as_ref(), &[vault.bump]];
        let signer = &[seeds];

        let cpi = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.vault_ata.to_account_info(),
                to: ctx.accounts.depositor_ata.to_account_info(),
                authority: vault.to_account_info(),
            },
            signer,
        );
        token::transfer(cpi, vault.amount)?;
        vault.status = 2; // Refunded
        Ok(())
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
