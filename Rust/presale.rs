// presale.rs
use anchor_lang::prelude::*;

#[program]
pub mod presale {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, amount: u64) -> ProgramResult {
        let presale = &mut ctx.accounts.presale;
        presale.amount = amount;
        Ok(())
    }

    pub fn buy_tokens(ctx: Context<BuyTokens>, amount: u64) -> ProgramResult {
        let presale = &mut ctx.accounts.presale;
        // Logic for buying tokens
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init)]
    pub presale: ProgramAccount<'info, Presale>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub presale: ProgramAccount<'info, Presale>,
}

#[account]
pub struct Presale {
    pub amount: u64,
}
