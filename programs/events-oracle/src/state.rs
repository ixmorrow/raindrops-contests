use {
    anchor_lang::prelude::*,
};

pub const EVENT_SIZE: usize = 8 + 32 + 8 + 8 + 32 + 1 + 1 + 1 + 8 + 8 + 32 + 32 + 1;
pub const EVENT_SEED: &str = "event";

pub const PARTICIPANT_SIZE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 32 + 32 + 1;
pub const PARTICIPANT_SEED: &str = "event-participant";

pub const MINT_AUTHORITY_SEED: &str = "mint-authority";
pub const CONTEST_MINT_SEED: &str = "contest-mint";

#[account]
pub struct Event {
    pub creator: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub pyth_price_feed: Pubkey,
    pub bump: u8,
    pub status: EventState,
    pub registration: EventState,
    pub final_price: i64,
    pub event_mint: Pubkey,
    pub mint_authority: Pubkey,
    pub mint_authority_bump: u8
}

#[account]
pub struct EventParticipant {
    pub user: Pubkey,
    pub event: Pubkey,
    pub prediction: u64,
    pub entry_time: i64,
    pub contestant_mint: Pubkey,
    pub contestant_token_acct: Pubkey,
    pub bump: u8
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum EventState {
    Open,
    Started,
    Closed,
    Finished
}