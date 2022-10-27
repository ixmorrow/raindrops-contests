use anchor_lang::prelude::*;
use {instructions::*};

pub mod errors;
pub mod instructions;
pub mod state;

declare_id!("887fNBoewDudLs7GUdEBFfpMZ9EmcFREK9Gmr3KY6pS7");

#[program]
pub mod events_oracle {
    use super::*;

    pub fn create_event(ctx: Context<CreateEventCtx>, end_time_unix: i64) -> Result<()> {
        create_event::handler(ctx, end_time_unix)
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
}
