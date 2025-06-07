#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};

declare_id!("ExgbQW44gemTQq6jzciCsdmyKg5u9vGeGc1iUR6PxnjF");

#[program]
pub mod nft_mint {
    use super::*;

    pub fn mint_nft(ctx: Context<MintNFT>) -> Result<()> {
        // For a true NFT, mint exactly one token.
        let amount: u64 = 1;

        // Prepare the MintTo CPI accounts.
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };

        // Bind the mint key and bump into local variables so that their lifetimes are long enough.
        let mint_key = ctx.accounts.mint.key();
        let bump_arr = [ctx.bumps.mint_authority];
        let signer_seeds = &[&[b"mint_authority", mint_key.as_ref(), &bump_arr][..]];

        // Execute the mint using the token program.
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds,
            ),
            amount,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    /// The mint account for the NFT.
    #[account(
        mut,
        constraint = mint.decimals == 0, // Ensure this is an NFT (0 decimals)
        constraint = mint.supply == 0     // Ensure no tokens have been minted yet
    )]
    pub mint: Account<'info, Mint>,
    /// The token account that will hold the minted NFT.
    #[account(
        mut,
        constraint = token_account.owner == payer.key(),
        constraint = token_account.mint == mint.key()
    )]
    pub token_account: Account<'info, TokenAccount>,
    /// CHECK: This PDA is derived from the seeds: [b"mint_authority", mint.key().as_ref()]
    #[account(
        seeds = [b"mint_authority", mint.key().as_ref()], // Changed here to use byte slice
        bump,
    )]
    pub mint_authority: AccountInfo<'info>,
    /// The payer for the transaction.
    #[account(mut)]
    pub payer: Signer<'info>,
    /// The token program.
    pub token_program: Program<'info, Token>,
    /// The system program.
    pub system_program: Program<'info, System>,
}
