#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("95DUxFM1maisbvcECkm7cb9YE9xdLLFad5RJA6Q3GdV3");

#[program]
pub mod kyc_blockchain {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("KYC Blockchain Initialized!");
        Ok(())
    }
    
    // Add new functions for KYC operations
    pub fn register_user(ctx: Context<RegisterUser>, name: String, id_hash: String) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let authority = &ctx.accounts.authority;
        
        user.authority = authority.key();
        user.name = name;
        user.id_hash = id_hash;
        user.verified = false;
        
        msg!("User registered successfully!");
        Ok(())
    }
    
    pub fn verify_user(ctx: Context<VerifyUser>) -> Result<()> {
        let user = &mut ctx.accounts.user;
        
        // Only allow verification by the program authority
        user.verified = true;
        
        msg!("User verified successfully!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + 50 + 4 + 64 + 1, // discriminator + pubkey + name + id_hash + verified
    )]
    pub user: Account<'info, UserAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyUser<'info> {
    #[account(mut)]
    pub user: Account<'info, UserAccount>,
    pub verifier: Signer<'info>,
}

#[account]
pub struct UserAccount {
    pub authority: Pubkey,
    pub name: String,
    pub id_hash: String,
    pub verified: bool,
}