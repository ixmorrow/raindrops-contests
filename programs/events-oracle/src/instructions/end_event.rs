use {
    anchor_lang::prelude::*,
    crate::state::*,
    crate::errors::*,
    pyth_sdk_solana::*
};

pub fn handler(ctx: Context<EndEventCtx>) -> Result<()> {

    let event = &mut ctx.accounts.event;
    msg!("Current time: {}", Clock::get().unwrap().unix_timestamp);
    msg!("Event end time: {}", event.end_time);
    
    //require_gt!(Clock::get().unwrap().unix_timestamp, event.end_time);

    // store final price to use
    let pyth_price_info = &ctx.accounts.pyth_price_feed;
    let price_feed = load_price_feed_from_account_info(&pyth_price_info).unwrap();
    let current_price = price_feed.get_current_price().ok_or(EventError::PriceFeedError).unwrap();
    msg!("Current price of SOL/USD: {:?}", current_price);

    event.final_price = current_price.price;
    msg!("Final price: {}", event.final_price);
    event.pyth_exponent = current_price.expo;
    msg!("Exponent: {}", event.pyth_exponent);

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
    pub event: Box<Account<'info, Event>>,
    /// CHECK: Pyth price feed
    #[account(
        mut,
        constraint = pyth_price_feed.key() == event.pyth_price_feed
        @ EventError::InvalidPythAccount
    )]
    pub pyth_price_feed: AccountInfo<'info>,
}