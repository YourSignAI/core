use anchor_lang::prelude::*;

#[error_code]
pub enum YourSignError {
    #[msg("invalid hash length")]
    InvalidHashLength,
    #[msg("ed25519 verification failed")]
    BadSignature,
    #[msg("signer not authorized for this document")]
    SignerNotAuthorized,
    #[msg("document already completed")]
    AlreadyCompleted,
    #[msg("document not in awaiting/partial state")]
    DocumentNotAwaiting,
}
