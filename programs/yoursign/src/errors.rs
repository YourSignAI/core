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
    #[msg("payment below required amount")]
    InsufficientPayment,
    #[msg("escrow already claimed")]
    EscrowAlreadyClaimed,
    #[msg("notary not whitelisted")]
    NotaryNotWhitelisted,

    // ADR-0007
    #[msg("delegation lifetime exceeds maximum (30d)")]
    DelegationLifetimeTooLong,
    #[msg("delegation has been revoked")]
    DelegationRevoked,
    #[msg("delegation expired")]
    DelegationExpired,
    #[msg("delegation already revoked")]
    AlreadyRevoked,
    #[msg("scope_hash mismatch with off-chain JSON")]
    ScopeHashMismatch,
    #[msg("tool id not present in manifest")]
    ToolNotInManifest,
    #[msg("tool disabled in manifest")]
    ToolDisabled,
    #[msg("spend exceeds tool manifest cap")]
    ToolSpendCapExceeded,
    #[msg("spend exceeds scope cap and no principal witness sig")]
    SpendCapExceeded,
    #[msg("agent action requires accompanying signature attestation in same tx")]
    MissingCoSignAttestation,
}
