use anchor_lang::prelude::*;

declare_id!("3vkW7i4dEzbxaW8BzfbgNjSj4g7ReqVFrsFA7xBAw3Xx");

#[program]
pub mod kyc_blockchain {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
