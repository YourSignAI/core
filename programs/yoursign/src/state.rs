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
pub struct AgentDelegation {
    pub delegation_id: [u8; 16],
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub scope_hash: [u8; 32],
    pub expires_at: i64,
    pub nonce: [u8; 32],
    pub principal_sig: [u8; 64],
    pub status: DelegationStatus,
    pub created_at: i64,
    pub revoked_at: Option<i64>,
}

impl AgentDelegation {
    // disc 8 + 16 + 32 + 32 + 32 + 8 + 32 + 64 + 1 + 8 + (1+8)
    pub const SIZE: usize = 8 + 16 + 32 + 32 + 32 + 8 + 32 + 64 + 1 + 8 + 1 + 8 + 32;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DelegationStatus {
    Active,
    Revoked,
    Expired,
}

#[account]
pub struct AgentAction {
    pub action_id: [u8; 16],
    pub delegation_id: [u8; 16],
    pub action_kind: ToolId,
    pub target_id: [u8; 32],
    pub agent_sig: [u8; 64],
    pub principal_sig_witness: Option<[u8; 64]>,
    pub timestamp: i64,
    pub slot: u64,
}

impl AgentAction {
    pub const SIZE: usize = 8 + 16 + 16 + 1 + 32 + 64 + 1 + 64 + 8 + 8 + 32;
}

#[account]
pub struct ToolManifest {
    pub authority: Pubkey,
    pub version: u8,
    pub tools: Vec<ToolEntry>,
    pub bump: u8,
}

impl ToolManifest {
    // headroom for ≤ 16 tool entries
    pub const SIZE: usize = 8 + 32 + 1 + 4 + (16 * 33) + 1 + 64;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ToolEntry {
    pub id: ToolId,
    pub max_spend_micro_usdc: u64,
    pub enabled: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ToolId {
    Delegate,
    SignDocument,
    Verify,
    Revoke,
}
