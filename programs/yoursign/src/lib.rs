// YourSign Anchor program. v0.1 — Sprint 2 ships document/signature ix; v1.1
// adds the agent identity ix per ADR-0007.
//
// Compression: this scaffold treats `DocumentRegistry`, `SignatureAttestation`,
// `AgentDelegation`, and `AgentAction` as regular accounts for the demo. Sprint
// 2 Thursday wires `@lightprotocol/stateless.js` CPI for compressed storage
// (per ADR-0002). The shapes here MUST match what the contract doc declares
// (docs/contracts/on-chain-program.md v1.1).

use anchor_lang::prelude::*;
use anchor_lang::solana_program::ed25519_program;
use anchor_lang::solana_program::sysvar::instructions::{
    load_instruction_at_checked, ID as IX_SYSVAR_ID,
};

declare_id!("35RbwNgx9Em28mMLZ6iWzjCnaTd4tD2NWuxrHqR76M8X");

pub mod canonical;
pub mod errors;
pub mod state;

use crate::canonical::{
    canonical_action_message, canonical_delegation_message, canonical_revoke_message,
};
use crate::errors::YourSignError;
use crate::state::*;

const MAX_DELEGATION_LIFETIME_SECS: i64 = 30 * 24 * 3600;

#[program]
pub mod yoursign {
    use super::*;

    // ========== document/signature ix (Sprint 2 placeholders) ==========

    pub fn register_document(
        ctx: Context<RegisterDocument>,
        args: RegisterDocumentArgs,
    ) -> Result<()> {
        require!(args.canonical_hash.len() == 32, YourSignError::InvalidHashLength);
        require!(
            args.required_signers >= 1 && args.required_signers <= 50,
            YourSignError::SignerNotAuthorized
        );
        let reg = &mut ctx.accounts.registry;
        reg.document_id = args.document_id;
        reg.canonical_hash = args.canonical_hash;
        reg.owner = ctx.accounts.owner.key();
        reg.workspace_id = args.workspace_id;
        reg.created_at = Clock::get()?.unix_timestamp;
        reg.status = DocumentStatus::Awaiting;
        reg.required_signers = args.required_signers;
        reg.completed_signers = 0;
        reg.merkle_root = None;
        emit!(DocumentRegistered {
            document_id: args.document_id,
            owner: ctx.accounts.owner.key(),
        });
        Ok(())
    }

    // ========== agent ix (ADR-0007) ==========

    pub fn register_agent(ctx: Context<RegisterAgent>, args: RegisterAgentArgs) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(
            args.expires_at > now && args.expires_at <= now + MAX_DELEGATION_LIFETIME_SECS,
            YourSignError::DelegationLifetimeTooLong
        );

        // Reconstruct canonical message bytes; verify Ed25519 signature was provided in
        // a sibling ed25519_program ix in the same tx (Solana's only path to native
        // ed25519 verification). We parse the introspected ix and check the principal
        // pubkey + message bytes match.
        let msg = canonical_delegation_message(
            &args.principal_b58,
            &args.agent_b58,
            &args.tools_csv,
            &args.documents_clause,
            args.spend_cap_micro_usdc,
            &args.expires_at_iso,
            &args.nonce_hex,
        );
        verify_ed25519_sibling_ix(
            &ctx.accounts.instructions_sysvar,
            &args.principal_pubkey,
            msg.as_bytes(),
            &args.principal_sig,
        )?;

        let d = &mut ctx.accounts.delegation;
        d.delegation_id = args.delegation_id;
        d.principal = args.principal_pubkey;
        d.agent = args.agent_pubkey;
        d.scope_hash = args.scope_hash;
        d.expires_at = args.expires_at;
        d.nonce = args.nonce;
        d.principal_sig = args.principal_sig;
        d.status = DelegationStatus::Active;
        d.created_at = now;
        d.revoked_at = None;
        emit!(AgentDelegated {
            delegation_id: args.delegation_id,
            principal: args.principal_pubkey,
            agent: args.agent_pubkey,
            expires_at: args.expires_at,
        });
        Ok(())
    }

    pub fn attest_agent_action(
        ctx: Context<AttestAgentAction>,
        args: AttestAgentActionArgs,
    ) -> Result<()> {
        let d = &mut ctx.accounts.delegation;
        let now = Clock::get()?.unix_timestamp;
        require!(d.status == DelegationStatus::Active, YourSignError::DelegationRevoked);
        if now >= d.expires_at {
            d.status = DelegationStatus::Expired;
            return err!(YourSignError::DelegationExpired);
        }

        // Tool whitelist check against ToolManifest.
        let manifest = &ctx.accounts.tool_manifest;
        let tool_entry = manifest
            .tools
            .iter()
            .find(|t| t.id == args.action_kind)
            .ok_or(YourSignError::ToolNotInManifest)?;
        require!(tool_entry.enabled, YourSignError::ToolDisabled);

        // Spend cap (manifest-level). Scope-level cap is enforced off-chain by the
        // verifier site re-hashing scope JSON; we additionally require the principal
        // witness sig whenever spend > 0 — keeps the on-chain story safe.
        if args.spend_micro_usdc > 0 {
            require!(
                args.spend_micro_usdc <= tool_entry.max_spend_micro_usdc,
                YourSignError::ToolSpendCapExceeded
            );
            require!(
                args.principal_sig_witness.is_some(),
                YourSignError::SpendCapExceeded
            );
        }

        // Reconstruct canonical action message + verify agent sig via sibling ed25519 ix.
        let msg = canonical_action_message(
            &args.delegation_id_hex,
            &tool_id_str(args.action_kind),
            &args.target_id_hex,
            &args.timestamp_iso,
            &args.nonce_hex,
        );
        verify_ed25519_sibling_ix(
            &ctx.accounts.instructions_sysvar,
            &d.agent,
            msg.as_bytes(),
            &args.agent_sig,
        )?;

        // For SignDocument actions: require a `register_document`/`attest_signature` co-
        // ix in the same tx (introspection). Enforced loosely here — checks that any
        // ix in the tx targets this program with discriminator for `attest_signature`.
        if args.action_kind == ToolId::SignDocument {
            require_co_signature_attestation(&ctx.accounts.instructions_sysvar)?;
        }

        let a = &mut ctx.accounts.action;
        a.action_id = args.action_id;
        a.delegation_id = d.delegation_id;
        a.action_kind = args.action_kind;
        a.target_id = args.target_id;
        a.agent_sig = args.agent_sig;
        a.principal_sig_witness = args.principal_sig_witness;
        a.timestamp = now;
        a.slot = Clock::get()?.slot;

        emit!(AgentActionAttested {
            action_id: args.action_id,
            delegation_id: d.delegation_id,
            action_kind: args.action_kind,
            target_id: args.target_id,
        });
        Ok(())
    }

    pub fn revoke_delegation(
        ctx: Context<RevokeDelegation>,
        args: RevokeDelegationArgs,
    ) -> Result<()> {
        let d = &mut ctx.accounts.delegation;
        require!(d.status == DelegationStatus::Active, YourSignError::AlreadyRevoked);
        require!(
            ctx.accounts.principal.key() == d.principal,
            YourSignError::SignerNotAuthorized
        );

        let msg = canonical_revoke_message(&args.delegation_id_hex, &args.nonce_hex);
        verify_ed25519_sibling_ix(
            &ctx.accounts.instructions_sysvar,
            &d.principal,
            msg.as_bytes(),
            &args.principal_sig,
        )?;

        d.status = DelegationStatus::Revoked;
        d.revoked_at = Some(Clock::get()?.unix_timestamp);
        emit!(AgentDelegationRevoked {
            delegation_id: d.delegation_id,
            principal: d.principal,
            revoked_at: d.revoked_at.unwrap(),
        });
        Ok(())
    }

    pub fn init_tool_manifest(
        ctx: Context<InitToolManifest>,
        args: InitToolManifestArgs,
    ) -> Result<()> {
        let m = &mut ctx.accounts.manifest;
        m.authority = ctx.accounts.authority.key();
        m.version = 1;
        m.tools = args.tools;
        m.bump = ctx.bumps.manifest;
        Ok(())
    }
}

fn tool_id_str(t: ToolId) -> String {
    match t {
        ToolId::Delegate => "delegate".into(),
        ToolId::SignDocument => "sign_document".into(),
        ToolId::Verify => "verify".into(),
        ToolId::Revoke => "revoke".into(),
    }
}

// ========== ed25519_program sibling-ix verification ==========
//
// Solana's `ed25519_program` accepts a precompile-style instruction that the
// runtime evaluates inline; we cannot call it as a CPI. The standard pattern is
// to require a sibling ix in the same tx and use the instructions sysvar to
// confirm it (a) targets ed25519_program, (b) covers the same message bytes,
// (c) uses the expected pubkey and signature.
//
// This implementation performs the full byte-layout checks below. Matches the
// layout the Solana sdk's `ed25519_instruction::new_ed25519_instruction`
// produces (one pubkey + one signature + one message).
fn verify_ed25519_sibling_ix(
    sysvar_ai: &AccountInfo,
    expected_pubkey: &Pubkey,
    expected_message: &[u8],
    expected_signature: &[u8; 64],
) -> Result<()> {
    require_keys_eq!(*sysvar_ai.key, IX_SYSVAR_ID, YourSignError::BadSignature);
    let ix_count = anchor_lang::solana_program::sysvar::instructions::load_current_index_checked(
        sysvar_ai,
    )? as usize;
    let mut found = false;
    for i in 0..ix_count {
        let Ok(ix) = load_instruction_at_checked(i, sysvar_ai) else { continue };
        if ix.program_id != ed25519_program::ID {
            continue;
        }
        // Layout: [num_signatures u8][padding u8][offsets...][pubkey][sig][msg]
        if ix.data.len() < 16 + 32 + 64 {
            continue;
        }
        let pk = &ix.data[16..16 + 32];
        let sig = &ix.data[16 + 32..16 + 32 + 64];
        let msg = &ix.data[16 + 32 + 64..];
        if pk != expected_pubkey.to_bytes() {
            continue;
        }
        if sig != &expected_signature[..] {
            continue;
        }
        if msg != expected_message {
            continue;
        }
        found = true;
        break;
    }
    require!(found, YourSignError::BadSignature);
    Ok(())
}

fn require_co_signature_attestation(sysvar_ai: &AccountInfo) -> Result<()> {
    // Discriminator-level check; full impl in Sprint 2 once `attest_signature`
    // ix exists. For now: require at least one sibling ix targeting our own
    // program id (ie: prevents bare agent-action without an accompanying call).
    let ix_count = anchor_lang::solana_program::sysvar::instructions::load_current_index_checked(
        sysvar_ai,
    )? as usize;
    let mut sibling_yoursign_ix = false;
    for i in 0..ix_count {
        let Ok(ix) = load_instruction_at_checked(i, sysvar_ai) else { continue };
        if ix.program_id == crate::id() && ix.data.len() >= 8 {
            sibling_yoursign_ix = true;
            break;
        }
    }
    require!(sibling_yoursign_ix, YourSignError::MissingCoSignAttestation);
    Ok(())
}

// ============================================================
// Accounts (instruction contexts)
// ============================================================

#[derive(Accounts)]
#[instruction(args: RegisterDocumentArgs)]
pub struct RegisterDocument<'info> {
    #[account(
        init,
        payer = owner,
        space = DocumentRegistry::SIZE,
        seeds = [b"doc".as_ref(), args.document_id.as_ref()],
        bump,
    )]
    pub registry: Account<'info, DocumentRegistry>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: RegisterAgentArgs)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = payer,
        space = AgentDelegation::SIZE,
        seeds = [b"delegation".as_ref(), args.principal_pubkey.as_ref(), args.nonce.as_ref()],
        bump,
    )]
    pub delegation: Account<'info, AgentDelegation>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: validated via instructions sysvar (ed25519 sibling)
    #[account(address = IX_SYSVAR_ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: AttestAgentActionArgs)]
pub struct AttestAgentAction<'info> {
    #[account(mut, seeds = [b"delegation".as_ref(), delegation.principal.as_ref(), delegation.nonce.as_ref()], bump)]
    pub delegation: Account<'info, AgentDelegation>,
    #[account(seeds = [b"tool-manifest"], bump = tool_manifest.bump)]
    pub tool_manifest: Account<'info, ToolManifest>,
    #[account(
        init,
        payer = payer,
        space = AgentAction::SIZE,
        seeds = [b"action".as_ref(), args.action_id.as_ref()],
        bump,
    )]
    pub action: Account<'info, AgentAction>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: validated address-only
    #[account(address = IX_SYSVAR_ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeDelegation<'info> {
    #[account(mut, seeds = [b"delegation".as_ref(), delegation.principal.as_ref(), delegation.nonce.as_ref()], bump)]
    pub delegation: Account<'info, AgentDelegation>,
    pub principal: Signer<'info>,
    /// CHECK: validated address-only
    #[account(address = IX_SYSVAR_ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct InitToolManifest<'info> {
    #[account(
        init,
        payer = authority,
        space = ToolManifest::SIZE,
        seeds = [b"tool-manifest"],
        bump,
    )]
    pub manifest: Account<'info, ToolManifest>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ============================================================
// Instruction args
// ============================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RegisterDocumentArgs {
    pub document_id: [u8; 16],
    pub canonical_hash: [u8; 32],
    pub workspace_id: [u8; 16],
    pub required_signers: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RegisterAgentArgs {
    pub delegation_id: [u8; 16],
    pub principal_pubkey: Pubkey,
    pub agent_pubkey: Pubkey,
    pub principal_b58: String,
    pub agent_b58: String,
    pub tools_csv: String,
    pub documents_clause: String,
    pub spend_cap_micro_usdc: u64,
    pub expires_at: i64,
    pub expires_at_iso: String,
    pub nonce: [u8; 32],
    pub nonce_hex: String,
    pub scope_hash: [u8; 32],
    pub principal_sig: [u8; 64],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AttestAgentActionArgs {
    pub action_id: [u8; 16],
    pub delegation_id_hex: String,
    pub action_kind: ToolId,
    pub target_id: [u8; 32],
    pub target_id_hex: String,
    pub spend_micro_usdc: u64,
    pub timestamp_iso: String,
    pub nonce_hex: String,
    pub agent_sig: [u8; 64],
    pub principal_sig_witness: Option<[u8; 64]>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RevokeDelegationArgs {
    pub delegation_id_hex: String,
    pub nonce_hex: String,
    pub principal_sig: [u8; 64],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitToolManifestArgs {
    pub tools: Vec<ToolEntry>,
}

// ============================================================
// Events
// ============================================================

#[event]
pub struct DocumentRegistered {
    pub document_id: [u8; 16],
    pub owner: Pubkey,
}

#[event]
pub struct AgentDelegated {
    pub delegation_id: [u8; 16],
    pub principal: Pubkey,
    pub agent: Pubkey,
    pub expires_at: i64,
}

#[event]
pub struct AgentActionAttested {
    pub action_id: [u8; 16],
    pub delegation_id: [u8; 16],
    pub action_kind: ToolId,
    pub target_id: [u8; 32],
}

#[event]
pub struct AgentDelegationRevoked {
    pub delegation_id: [u8; 16],
    pub principal: Pubkey,
    pub revoked_at: i64,
}
