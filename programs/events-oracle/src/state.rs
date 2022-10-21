use {
    anchor_lang::prelude::*,
};

pub const EVENT_SIZE: usize = 8 + 32 + 8 + 8 + 32 + 1 + 1 + 1 + 8 + 8;
pub const EVENT_SEED: &str = "event";

pub const PARTICIPANT_SIZE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1;
pub const PARTICIPANT_SEED: &str = "event-participant";

#[account]
pub struct Event {
    pub creator: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub pyth_acct: Pubkey,
    pub bump: u8,
    pub status: EventState,
    pub registration: EventState,
    pub final_price: u64
}

#[account]
pub struct EventParticipant {
    pub user: Pubkey,
    pub event: Pubkey,
    pub prediction: u64,
    pub entry_time: i64,
    pub bump: u8
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum EventState {
    Open,
    Started,
    Closed,
    Finished
}