use anchor_lang::prelude::*;
use {instructions::*};

pub mod errors;
pub mod instructions;
pub mod state;

declare_id!("HbR4nXvUASns7kybpVN8CNggykFhgtHQThvMZv3AihBw");

#[program]
pub mod events_oracle {
    use super::*;

    pub fn create_event(ctx: Context<CreateEventCtx>, end_betting: i64, end_time_unix: i64, submission_window: i64, wager_amt: u64) -> Result<()> {
        create_event::handler(ctx, end_betting, end_time_unix, submission_window,  wager_amt)
    }

    pub fn join_event(ctx: Context<JoinEventCtx>, prediction: u64) -> Result<()> {
        join_event::handler(ctx, prediction)
    }

    pub fn end_event(ctx: Context<EndEventCtx>) -> Result<()> {
        end_event::handler(ctx)
    }

    pub fn submit_prediction(ctx: Context<SubmitPredictionCtx>) -> Result<()> {
        submit_prediction::handler(ctx)
    }

    pub fn claim_rewards(ctx: Context<ClaimRewardsCtx>) -> Result<()> {
        claim_rewards::handler(ctx)
    }
}
