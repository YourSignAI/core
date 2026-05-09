use anchor_lang::prelude::*;

#[account]
pub struct DocumentRegistry {
    pub document_id: [u8; 16],
    pub canonical_hash: [u8; 32],
    pub owner: Pubkey,
    pub workspace_id: [u8; 16],
    pub created_at: i64,
    pub status: DocumentStatus,
    pub required_signers: u8,
    pub completed_signers: u8,
    pub merkle_root: Option<[u8; 32]>,
}

impl DocumentRegistry {
    // 8 disc + 16 + 32 + 32 + 16 + 8 + 1 + 1 + 1 + (1+32) ≈ 148 — round up
    pub const SIZE: usize = 8 + 16 + 32 + 32 + 16 + 8 + 1 + 1 + 1 + 1 + 32 + 16;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DocumentStatus {
    Awaiting,
    Partial,
    Completed,
    Declined,
}

#[account]
pub struct SignatureAttestation {
    pub document_id: [u8; 16],
    pub signer: Pubkey,
    pub signature: [u8; 64],
    pub message_hash: [u8; 32],
    pub timestamp: i64,
    pub kind: AttestationKind,
}

impl SignatureAttestation {
    pub const SIZE: usize = 8 + 16 + 32 + 64 + 32 + 8 + 1 + 16;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum AttestationKind {
    Sign,
    Decline,
    NotaryCounterSign,
}
