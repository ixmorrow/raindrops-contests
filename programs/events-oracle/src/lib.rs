use anchor_lang::prelude::*;
use {anchor_lang::prelude::*, instructions::*};

pub mod errors;
pub mod instructions;
pub mod state;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

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
}
