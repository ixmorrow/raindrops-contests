use {
    anchor_lang::prelude::*,
    crate::state::*,
    crate::errors::*,
    anchor_spl::{
        token::{TokenAccount, Token, Mint, Transfer, transfer},
    }
};

pub fn handler(ctx: Context<ClaimRewardsCtx>) -> Result<()> {
    let contest = &ctx.accounts.event;
    let participant = &ctx.accounts.participant;

    require!(contest.prediction_submission_window + contest.end_time < Clock::get().unwrap().unix_timestamp, EventError::SubmissionPeriodNotOver);
    require!(contest.winner == participant.key(), EventError::NoRewardsToClaim);
    msg!("Congrats, you are the winner!");
    
    // verify user has SFT

    // program signer seeds
    let auth_bump = contest.mint_authority_bump;
    let auth_seeds = &[MINT_AUTHORITY_SEED.as_bytes(), &[auth_bump]];
    let signer = &[&auth_seeds[..]];

    msg!("Pot total: {}", contest.pot_total);

    // transfer to user
    transfer(ctx.accounts.transfer_ctx().with_signer(signer), contest.pot_total)?;

    msg!("Rewards claimed!");

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimRewardsCtx<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        seeds = [user.key().as_ref(), event.key().as_ref(), PARTICIPANT_SEED.as_bytes()],
        bump,
        constraint = user.key() == participant.user
    )]
    pub participant: Box<Account<'info, EventParticipant>>,
    pub event: Box<Account<'info, Event>>,
    #[account(mut)]
    pub contest_mint: Account<'info, Mint>,
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_wager_token_account.mint == event.reward_mint
    )]
    pub user_wager_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = reward_vault.key() == event.reward_vault
    )]
    pub reward_vault: Account<'info, TokenAccount>,
    ///CHECK: Program signer
    #[account(
        seeds = [MINT_AUTHORITY_SEED.as_bytes()],
        bump = event.mint_authority_bump
    )]
    pub program_mint_authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

impl<'info> ClaimRewardsCtx <'info> {
    pub fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.reward_vault.to_account_info(),
            to: self.user_wager_token_account.to_account_info(),
            authority: self.program_mint_authority.to_account_info()
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}