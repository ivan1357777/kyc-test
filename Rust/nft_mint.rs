// nft_mint.rs
use anchor_lang::prelude::*;

#[program]
pub mod nft_mint {
    use super::*;
    pub fn mint_nft(ctx: Context<MintNFT>, amount: u64) -> ProgramResult {
        let nft = &mut ctx.accounts.nft;
        nft.amount = amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(init)]
    pub nft: ProgramAccount<'info, NFT>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct NFT {
    pub amount: u64,
}
