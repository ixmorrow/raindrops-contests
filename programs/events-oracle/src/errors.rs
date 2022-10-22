use anchor_lang::prelude::*;

#[error_code]
pub enum EventError {
    #[msg("Event no longer accepting new participants")]
    RegistrationError,
    #[msg("You do not meet the qualifications for this event")]
    InvalidEventQualifications,
    #[msg("Only the even creator/authority can perform this action")]
    InvalidEventAuthority,
    #[msg("Pyth account provided does not match Event pyth account")]
    InvalidPythAccount,
    #[msg("Error loading price feed")]
    PriceFeedError
}