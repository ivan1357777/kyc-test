// rewards.rs
use anchor_lang::prelude::*;

#[program]
pub mod rewards {
    use super::*;
    pub fn distribute(ctx: Context<Distribute>, amount: u64) -> ProgramResult {
        let reward = &mut ctx.accounts.reward;
        reward.amount = amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Distribute<'info> {
    #[account(mut)]
    pub reward: ProgramAccount<'info, Reward>,
}

#[account]
pub struct Reward {
    pub amount: u64,
}
