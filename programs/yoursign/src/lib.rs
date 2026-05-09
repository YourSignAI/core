// YourSign Anchor program — Sprint 2 demo build.
//
// Trimmed to only the document + signature ix to fit within the deployer's
// budget for the hackathon devnet upgrade. Agent ix (register_agent,
// attest_agent_action, revoke_delegation, init_tool_manifest) and the
// canonical-message helpers were removed to shrink the .so by ~50%; they
// will land back in v1.1 once the agent flow needs on-chain enforcement
// (per ADR-0007). The PDA seed layouts and DocumentRegistry account shape
// are unchanged from v0.1, so existing on-chain registries remain readable.

use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("35RbwNgx9Em28mMLZ6iWzjCnaTd4tD2NWuxrHqR76M8X");

pub mod errors;
pub mod state;

use crate::errors::YourSignError;
use crate::state::*;

// Treasury wallet — collects per-instruction fees enforced via CPI. The
// account constraint pins this pubkey so callers cannot redirect the fee.
pub mod treasury {
    use anchor_lang::declare_id;
    declare_id!("5zUvmko9FM3JM4wwXnb8C3HUY6kRRyK2mZYg4V1E9vMm");
}

const REGISTER_FEE_LAMPORTS: u64 = 1_000_000;   // 0.001 SOL
const ATTEST_FEE_LAMPORTS: u64 = 500_000;        // 0.0005 SOL

#[program]
pub mod yoursign {
    use super::*;

    pub fn register_document(
        ctx: Context<RegisterDocument>,
        args: RegisterDocumentArgs,
    ) -> Result<()> {
        require!(args.canonical_hash.len() == 32, YourSignError::InvalidHashLength);
        require!(
            args.required_signers >= 1 && args.required_signers <= 50,
            YourSignError::SignerNotAuthorized
        );

        // Treasury fee enforced via CPI. Caller cannot bypass this — the
        // address constraint pins the treasury account.
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.owner.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            REGISTER_FEE_LAMPORTS,
        )?;

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

    /// Attest a signature on a document. Each signer calls this once per
    /// document. The Solana tx signature on `signer` binds the attestation
    /// cryptographically — no separate ed25519 sibling-ix is required for
    /// self-sign / EOA path. Bumps `completed_signers` and flips `status`
    /// to `Completed` when the threshold is met.
    pub fn attest_signature(
        ctx: Context<AttestSignature>,
        args: AttestSignatureArgs,
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        require!(
            registry.status == DocumentStatus::Awaiting
                || registry.status == DocumentStatus::Partial,
            YourSignError::DocumentNotAwaiting
        );
        require!(
            registry.document_id == args.document_id,
            YourSignError::SignerNotAuthorized
        );

        // Treasury fee enforced via CPI. Same caller-cannot-bypass guarantee
        // as register_document.
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.signer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            ATTEST_FEE_LAMPORTS,
        )?;

        let att = &mut ctx.accounts.attestation;
        att.document_id = args.document_id;
        att.signer = ctx.accounts.signer.key();
        att.signature = args.signature;
        att.message_hash = args.message_hash;
        att.timestamp = Clock::get()?.unix_timestamp;
        att.kind = args.kind;

        if args.kind == AttestationKind::Decline {
            registry.status = DocumentStatus::Declined;
            emit!(DocumentDeclined {
                document_id: args.document_id,
                signer: ctx.accounts.signer.key(),
            });
            return Ok(());
        }

        registry.completed_signers = registry.completed_signers.saturating_add(1);
        if registry.completed_signers >= registry.required_signers {
            registry.status = DocumentStatus::Completed;
            emit!(DocumentCompleted {
                document_id: args.document_id,
                completed_signers: registry.completed_signers,
            });
        } else {
            registry.status = DocumentStatus::Partial;
        }

        emit!(SignatureAttested {
            document_id: args.document_id,
            signer: ctx.accounts.signer.key(),
            kind: args.kind,
            completed_signers: registry.completed_signers,
            required_signers: registry.required_signers,
        });
        Ok(())
    }
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
    /// CHECK: pinned to the treasury pubkey above; receives the platform fee
    /// via CPI in the handler.
    #[account(mut, address = crate::treasury::ID)]
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: AttestSignatureArgs)]
pub struct AttestSignature<'info> {
    #[account(
        mut,
        seeds = [b"doc".as_ref(), args.document_id.as_ref()],
        bump,
    )]
    pub registry: Account<'info, DocumentRegistry>,
    #[account(
        init,
        payer = signer,
        space = SignatureAttestation::SIZE,
        seeds = [b"sig".as_ref(), args.document_id.as_ref(), signer.key().as_ref()],
        bump,
    )]
    pub attestation: Account<'info, SignatureAttestation>,
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: pinned to the treasury pubkey above; receives the platform fee
    /// via CPI in the handler.
    #[account(mut, address = crate::treasury::ID)]
    pub treasury: AccountInfo<'info>,
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
pub struct AttestSignatureArgs {
    pub document_id: [u8; 16],
    pub signature: [u8; 64],
    pub message_hash: [u8; 32],
    pub kind: AttestationKind,
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
pub struct SignatureAttested {
    pub document_id: [u8; 16],
    pub signer: Pubkey,
    pub kind: AttestationKind,
    pub completed_signers: u8,
    pub required_signers: u8,
}

#[event]
pub struct DocumentCompleted {
    pub document_id: [u8; 16],
    pub completed_signers: u8,
}

#[event]
pub struct DocumentDeclined {
    pub document_id: [u8; 16],
    pub signer: Pubkey,
}
