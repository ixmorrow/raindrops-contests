use {
    anchor_lang::prelude::*,
    crate::state::*,
    crate::errors::*
};


pub fn handler(ctx: Context<JoinEventCtx>, prediction: u64) -> Result<()> {
    let event = &ctx.accounts.event;

    // verify event is not closed
    if event.registration == EventState::Closed || event.status == EventState::Finished {
        return Err(error!(EventError::RegistrationError));
    }
    // verify user qualifies

    // add user to event
    let participant = &mut ctx.accounts.participant;
    participant.user = ctx.accounts.user.key();
    participant.event = event.key();
    participant.prediction = prediction;
    participant.entry_time = Clock::get().unwrap().unix_timestamp;
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
    pub system_program: Program<'info, System>
}