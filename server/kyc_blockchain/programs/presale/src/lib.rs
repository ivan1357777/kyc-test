#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Token, Transfer};
use anchor_lang::solana_program::{
    system_instruction,
    program::invoke_signed,
};

declare_id!("CQrfC25gmpxo8Fm4zGf8aYFyzqexoyZqJL76Cw1HT4En");

#[program]
pub mod presale {
    use super::*;

    pub fn initialize_presale(
        ctx: Context<InitializePresale>,
        total_tokens: u64,
        token_price: u64,
    ) -> Result<()> {
        let presale = &mut ctx.accounts.presale;
        presale.admin = ctx.accounts.admin.key();
        presale.total_tokens = total_tokens;
        presale.tokens_sold = 0;
        presale.token_price = token_price;
        presale.mint = ctx.accounts.mint.key();
        presale.vault = ctx.accounts.vault.key();
        presale.bump = ctx.bumps.presale;
        emit!(PresaleInitialized {
            total_tokens,
            token_price,
            mint: presale.mint,
            vault: presale.vault,
        });
        Ok(())
    }

    pub fn buy_tokens(ctx: Context<BuyTokens>, amount: u64) -> Result<()> {
        require!(amount > 0, PresaleError::InvalidAmount);
        let presale = &mut ctx.accounts.presale;

        let available_tokens = presale
            .total_tokens
            .checked_sub(presale.tokens_sold)
            .ok_or(PresaleError::CalculationError)?;
        require!(available_tokens >= amount, PresaleError::InsufficientTokens);

        let required_lamports = amount
            .checked_mul(presale.token_price)
            .ok_or(PresaleError::CalculationError)?;
        
        // Transfer lamports from buyer to vault.
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            required_lamports,
        )?;

        // Derive signer seeds for the presale authority PDA.
        let signer_seeds: &[&[&[u8]]] = &[&[b"presale_authority", &presale.key().to_bytes(), &[ctx.bumps.presale_authority]]];

        // Call the SPL token mint_to instruction via CPI.
        // Note: We use AccountInfo for mint here to bypass Anchor's raw constraint check.
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.presale_authority.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        presale.tokens_sold = presale.tokens_sold.checked_add(amount).unwrap();
        
        let buyer_state = &mut ctx.accounts.buyer_state;
        if buyer_state.tokens_purchased == 0 {
            buyer_state.set_inner(BuyerState {
                buyer: ctx.accounts.buyer.key(),
                tokens_purchased: amount,
            });
        } else {
            buyer_state.tokens_purchased = buyer_state.tokens_purchased.checked_add(amount).unwrap();
        }

        emit!(TokensPurchased {
            buyer: ctx.accounts.buyer.key(),
            amount,
            tokens_sold: presale.tokens_sold,
        });

        Ok(())
    }
    
    pub fn close_presale(_ctx: Context<ClosePresale>) -> Result<()> {
        msg!("Closing presale account.");
        Ok(())
    }

    pub fn withdraw_tokens(ctx: Context<WithdrawTokens>, amount: u64) -> Result<()> {
        // 1) amount must be positive
        require!(amount > 0, PresaleError::InvalidWithdrawAmount);

        // 2) bind keys & bumps to locals so their references live long enough
        let presale_key: Pubkey = ctx.accounts.presale.key();
        let bump: u8 = ctx.bumps.presale_authority;
        let bump_seed: [u8; 1] = [bump];

        // 3) build signer seeds array
        let seeds: [&[u8]; 3] = [
            b"presale_authority".as_ref(),
            presale_key.as_ref(),
            &bump_seed,
        ];
        let signer_seeds: &[&[u8]] = &seeds;

        // 4) invoke SPL Token transfer with PDA signer
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.vault_token_account.to_account_info(),
                    to:        ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.presale_authority.to_account_info(),
                },
                &[signer_seeds],
            ),
            amount,
        )?;

        Ok(())
    }

    pub fn withdraw_sol(ctx: Context<WithdrawSol>, amount: u64) -> Result<()> {
        // 1) must be positive
        require!(amount > 0, PresaleError::InvalidWithdrawAmount);

        // 2) grab the bump from your on-chain state
        let bump = ctx.accounts.presale.bump;
        let seeds = &[
            b"presale".as_ref(),
            b"v6".as_ref(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        // 3) perform a signed system transfer (lamports)
        let from = ctx.accounts.presale.to_account_info();
        let to   = ctx.accounts.recipient.to_account_info();
        let sys  = ctx.accounts.system_program.to_account_info();

        invoke_signed(
            &system_instruction::transfer(&from.key(), &to.key(), amount),
            &[from, to, sys],
            signer,
        )?;
        Ok(())
    }
}

#[event]
pub struct PresaleInitialized {
    pub total_tokens: u64,
    pub token_price: u64,
    pub mint: Pubkey,
    pub vault: Pubkey,
}

#[event]
pub struct TokensPurchased {
    pub buyer: Pubkey,
    pub amount: u64,
    pub tokens_sold: u64,
}

#[derive(Accounts)]
#[instruction(total_tokens: u64, token_price: u64)]
pub struct InitializePresale<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 8 + 8 + 8 + 32 + 32 + 1 + 200, // discriminator + fields + extra padding
        seeds = [&b"presale"[..], &b"v6"[..]],
        bump
    )]
    pub presale: Account<'info, Presale>,
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: Vault account.
    #[account(mut)]
    pub vault: AccountInfo<'info>,
    /// CHECK: Mint account.
    #[account(mut)]
    pub mint: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(
        mut,
        seeds = [b"presale", b"v6"],
        bump = presale.bump
    )]
    pub presale: Account<'info, Presale>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: Mint account; must match presale.mint.
    #[account(mut, address = presale.mint)]
    pub mint: AccountInfo<'info>,
    /// CHECK: Buyer's token account.
    #[account(mut)]
    pub buyer_token_account: AccountInfo<'info>,
    /// CHECK: Presale authority PDA; derived from [b"presale_authority", presale.key().as_ref()].
    #[account(
        seeds = [b"presale_authority", presale.key().as_ref()],
        bump
    )]
    pub presale_authority: AccountInfo<'info>,
    /// CHECK: Vault account; must match presale.vault.
    #[account(mut, address = presale.vault)]
    pub vault: AccountInfo<'info>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + 32 + 8 + 100,
        seeds = [b"buyer", presale.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub buyer_state: Account<'info, BuyerState>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClosePresale<'info> {
    #[account(mut, close = admin)]
    pub presale: Account<'info, Presale>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawTokens<'info> {
    /// presale state (must include `bump: u8`)
    #[account(
        mut,
        seeds = [b"presale", b"v6"],
        bump = presale.bump,
    )]
    pub presale: Account<'info, Presale>,

    /// PDA authority for vault
    #[account(
        seeds = [b"presale_authority", presale.key().as_ref()],
        bump,  // stored in ctx.bumps.presale_authority
    )]
    /// CHECK: this is our program-derived authority
    pub presale_authority: UncheckedAccount<'info>,

    /// the vault SPL-token account (owned by `presale_authority`)
    #[account(mut)]
    /// CHECK: must be the authority’s ATA for the mint
    pub vault_token_account: UncheckedAccount<'info>,

    /// destination ATA (e.g. user’s wallet ATA for same mint)
    #[account(mut)]
    /// CHECK: must match same mint as vault
    pub destination: UncheckedAccount<'info>,

    /// SPL Token program
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    /// The presale state PDA holding lamports
    #[account(
        mut,
        seeds = [b"presale", b"v6"],
        bump = presale.bump,
    )]
    pub presale: Account<'info, Presale>,

    /// The recipient of the SOL
    #[account(mut)]
    /// CHECK: this is your wallet’s AccountInfo
    pub recipient: UncheckedAccount<'info>,

    /// System program to move lamports
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Presale {
    pub admin: Pubkey,
    pub total_tokens: u64,
    pub tokens_sold: u64,
    pub token_price: u64,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub bump: u8,
}

#[account]
pub struct BuyerState {
    pub buyer: Pubkey,
    pub tokens_purchased: u64,
}

#[error_code]
pub enum PresaleError {
    #[msg("Not enough tokens available")]
    InsufficientTokens,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Calculation error")]
    CalculationError,
    #[msg("Invalid mint authority")]
    InvalidMintAuthority,
    #[msg("Withdrawal amount must be greater than zero.")]
    InvalidWithdrawAmount,
}
