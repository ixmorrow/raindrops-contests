use anchor_lang::prelude::*;

#[error_code]
pub enum EventError {
    #[msg("Event no longer accepting new participants")]
    RegistrationError,
    #[msg("You do not meet the qualifications for this event")]
    InvalidEventQualifications
}