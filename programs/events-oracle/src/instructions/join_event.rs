use {
    anchor_lang::prelude::*,
    crate::state::*,
    crate::errors::*,
    anchor_spl::{
        token::{MintTo, Token, TokenAccount, Mint, mint_to},
        associated_token::AssociatedToken,
    }
};


pub fn handler(ctx: Context<JoinEventCtx>, prediction: u64) -> Result<()> {
    let event = &ctx.accounts.event;

    // verify event is not closed
    if event.registration == EventState::Closed || event.status == EventState::Finished {
        return Err(error!(EventError::RegistrationError));
    }
    
    // verify user qualifies

    // program signer seeds
    let auth_bump = event.mint_authority_bump;
    let auth_seeds = &[MINT_AUTHORITY_SEED.as_bytes(), &[auth_bump]];
    let signer = &[&auth_seeds[..]];

    // mint user contest SFT
    mint_to(
        ctx.accounts.mint_ctx().with_signer(signer),
        1
    )?;


    // add user to event
    let participant = &mut ctx.accounts.participant;
    participant.user = ctx.accounts.user.key();
    participant.event = event.key();
    participant.prediction = prediction;
    participant.entry_time = Clock::get().unwrap().unix_timestamp;
    participant.contestant_mint = ctx.accounts.contest_mint.key();
    participant.contestant_token_acct = ctx.accounts.user_token_account.key();
    participant.bump = *ctx.bumps.get("participant").unwrap();

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
    pub participant: Account<'info, EventParticipant>,
    pub event: Account<'info, Event>,
    #[account(mut)]
    pub contest_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = user,
        associated_token::mint = contest_mint,
        associated_token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,
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
}