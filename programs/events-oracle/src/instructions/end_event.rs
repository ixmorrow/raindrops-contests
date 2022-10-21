use {
    anchor_lang::prelude::*,
    crate::state::*,
    crate::errors::*
};

pub fn handler(ctx: Context<EndEventCtx>) -> Result<()> {

    let event = &mut ctx.accounts.event;
    msg!("Current time: {}", Clock::get().unwrap().unix_timestamp);
    msg!("Event end time: {}", event.end_time);
    
    require_gt!(Clock::get().unwrap().unix_timestamp, event.end_time);

    // store final price to use
    event.status = EventState::Finished;
    event.registration = EventState::Closed;

    Ok(())
}

#[derive(Accounts)]
pub struct EndEventCtx<'info> {
    #[account(
        constraint = authority.key() == event.creator
        @ EventError::InvalidEventAuthority
    )]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [authority.key().as_ref(), EVENT_SEED.as_bytes()],
        bump = event.bump,
    )]
    pub event: Account<'info, Event>,
    /// CHECK: Pyth price feed
    #[account(
        constraint = pyth_acct.key() == event.pyth_acct
        @ EventError::InvalidPythAccount
    )]
    pub pyth_acct: AccountInfo<'info>,
}