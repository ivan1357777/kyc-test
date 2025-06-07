#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("6mjNJ1d4uGJt6XgBRd6bUd7G7ZWsYqLmQkoXnEjWo8GR");

#[program]
pub mod smart_contract {
    use super::*;
    
    pub fn initialize(ctx: Context<Initialize>, init_data: u64) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        my_account.data = init_data;
        Ok(())
    }
    
    pub fn update(ctx: Context<Update>, new_data: u64) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        my_account.data = new_data;
        Ok(())
    }

    pub fn claim_referral_reward(
        ctx: Context<ClaimReferralReward>,
        amount: u64,
    ) -> Result<()> {
        // Verify amount
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Transfer tokens from vault to recipient
        let cpi_accounts = Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };

        // Get PDA signer seeds
        let vault_seed = b"vault_authority";
        let bump = ctx.bumps.vault_authority;
        let seeds = &[vault_seed.as_ref(), &[bump]];
        let signer: &[&[&[u8]]] = &[seeds];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        
        token::transfer(cpi_ctx, amount)?;
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,                                // Force account creation
        seeds = [b"smart_contract", user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + 8 + 24                   // 8 bytes for discriminator, 8 for the u64 field, plus 24 bytes extra padding (total = 40 bytes)
    )]
    pub my_account: Account<'info, MyData>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub my_account: Account<'info, MyData>,
}

#[derive(Accounts)]
#[instruction(referrer_code: String)]
pub struct ClaimReferralReward<'info> {
    #[account(
        seeds = [b"referral_program"],
        bump = referral_program.bump,
    )]
    pub referral_program: Account<'info, ReferralProgram>,

    #[account(
        mut,
        seeds = [b"referrer", referrer_code.as_bytes()],
        bump,
    )]
    pub referrer: Account<'info, ReferrerAccount>,

    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA authority for the vault
    #[account(
        seeds = [b"vault_authority", referral_program.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub recipient: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct MyData {
    pub data: u64,
}

#[account]
pub struct ReferralProgram {
    pub bump: u8,
    // Add any other fields your referral program needs
}

#[account]
pub struct ReferrerAccount {
    pub referrer_code: String,
    pub total_rewards: u64,
    pub bump: u8,
    // Add any other fields your referrer account needs
}

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
}