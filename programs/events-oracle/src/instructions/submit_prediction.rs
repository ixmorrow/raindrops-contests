use {
    anchor_lang::prelude::*,
    crate::state::*,
    crate::errors::*,
    anchor_spl::{
        token::{TokenAccount},
    }
};

pub fn handler(ctx: Context<SubmitPredictionCtx>) -> Result<()> {
    let contest = &mut ctx.accounts.event;
    require!(contest.status == EventState::Finished, EventError::InvalidSubmission); 
    
    require!(Clock::get().unwrap().unix_timestamp <= contest.end_time + contest.prediction_submission_window, EventError::InvalidSubmission);

    let _user_token_acct = &ctx.accounts.user_token_account;
    //require!(user_token_acct.balance == 1, EventError::MissingContestToken);

    let particiapnt = &ctx.accounts.participant;

    msg!("Contest final SOL price: {}", contest.final_price);
    msg!("Current best guess: {}", contest.closest_prediction);
    msg!("Particiapnt's guess: {}", particiapnt.prediction);

    if ((particiapnt.prediction as i64).checked_sub(contest.final_price).unwrap()).abs() < ((contest.closest_prediction as i64).checked_sub(contest.final_price.try_into().unwrap()).unwrap()).abs() {
        msg!("Difference between current guess and final price: {}", (particiapnt.prediction as i64).checked_sub(contest.final_price).unwrap().abs());
        contest.closest_prediction = particiapnt.prediction;
        contest.winner = ctx.accounts.participant.key();
    }

    Ok(())
}

#[derive(Accounts)]
pub struct SubmitPredictionCtx<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        seeds = [user.key().as_ref(), event.key().as_ref(), PARTICIPANT_SEED.as_bytes()],
        bump,
        constraint = participant.user == user.key()
    )]
    pub participant: Account<'info, EventParticipant>,
    #[account(
        mut,
        constraint = event.key() == participant.event
    )]
    pub event: Box<Account<'info, Event>>,
    #[account(
        constraint = user_token_account.mint == event.event_mint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
}