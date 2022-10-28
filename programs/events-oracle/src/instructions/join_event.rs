use {
    anchor_lang::prelude::*,
    crate::state::*,
    crate::errors::*,
    anchor_spl::{
        token::{MintTo, Token, TokenAccount, Mint, Transfer, transfer, mint_to},
        associated_token::AssociatedToken,
    }
};


pub fn handler(ctx: Context<JoinEventCtx>, prediction: u64) -> Result<()> {
    // verify event is not closed
    if ctx.accounts.event.registration == EventState::Closed || Clock::get().unwrap().unix_timestamp > ctx.accounts.event.end_betting {
        return Err(error!(EventError::RegistrationError));
    }
    
    // verify user qualifies

    // program signer seeds
    let auth_bump = ctx.accounts.event.mint_authority_bump;
    let auth_seeds = &[MINT_AUTHORITY_SEED.as_bytes(), &[auth_bump]];
    let signer = &[&auth_seeds[..]];

    // mint user contest SFT
    mint_to(
        ctx.accounts.mint_ctx().with_signer(signer),
        1
    )?;

    // transfer wager amt to reward vault
    transfer(ctx.accounts.transfer_ctx(), ctx.accounts.event.wager_amt)?;

    // add user to event
    let participant = &mut ctx.accounts.participant;
    participant.user = ctx.accounts.user.key();
    participant.event = ctx.accounts.event.key();
    participant.prediction = prediction;
    participant.entry_time = Clock::get().unwrap().unix_timestamp;
    participant.contestant_mint = ctx.accounts.contest_mint.key();
    participant.contestant_token_acct = ctx.accounts.user_token_account.key();
    participant.bump = *ctx.bumps.get("participant").unwrap();

    ctx.accounts.event.pot_total = ctx.accounts.event.pot_total.checked_add(ctx.accounts.event.wager_amt).unwrap();

    Ok(())
}

#[derive(Accounts)]
pub struct JoinEventCtx<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        seeds = [user.key().as_ref(), event.key().as_ref(), PARTICIPANT_SEED.as_bytes()],
        bump,
        payer = user,
        space = PARTICIPANT_SIZE
    )]
    pub participant: Box<Account<'info, EventParticipant>>,
    #[account(mut)]
    pub event: Box<Account<'info, Event>>,
    #[account(mut)]
    pub contest_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = user,
        associated_token::mint = contest_mint,
        associated_token::authority = user
    )]
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
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}

impl<'info> JoinEventCtx <'info> {
    pub fn mint_ctx(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = MintTo {
            mint: self.contest_mint.to_account_info(),
            to: self.user_token_account.to_account_info(),
            authority: self.program_mint_authority.to_account_info()
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }

    pub fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.user_wager_token_account.to_account_info(),
            to: self.reward_vault.to_account_info(),
            authority: self.user.to_account_info()
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}