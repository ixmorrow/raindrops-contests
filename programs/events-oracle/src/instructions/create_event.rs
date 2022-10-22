use {
    anchor_lang::prelude::*,
    crate::state::*,
};


pub fn handler(ctx: Context<CreateEventCtx>, end_time_unix: i64) -> Result<()> {
    // event must end in future
    require_gt!(end_time_unix, Clock::get().unwrap().unix_timestamp);

    let event = &mut ctx.accounts.event;
    event.creator = ctx.accounts.authority.key();
    event.bump = *ctx.bumps.get("event").unwrap();
    event.start_time = Clock::get().unwrap().unix_timestamp;
    event.end_time = end_time_unix;
    event.status = EventState::Started;
    event.registration = EventState::Open;
    event.pyth_price_feed = ctx.accounts.pyth_price_feed.key();

    Ok(())
}

#[derive(Accounts)]
pub struct CreateEventCtx<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        seeds = [authority.key().as_ref(), EVENT_SEED.as_bytes()],
        bump,
        payer = authority,
        space = EVENT_SIZE
    )]
    pub event: Account<'info, Event>,
    /// CHECK: pyth account, should run some check on it
    pub pyth_price_feed: AccountInfo<'info>,
    pub system_program: Program<'info, System>
}