# Contract — `yoursign` Anchor program

> Canonical source of truth for the on-chain program in `programs/yoursign`. The Anchor IDL is generated from this spec, not the other way around.

- Cluster: `mainnet-beta` (prod), `devnet` (dev)
- Framework: Anchor (latest stable)
- Compression: Light Protocol (`@lightprotocol/stateless.js`)
- Payment asset: USDC SPL `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

## Accounts

### `PricingConfig` (regular, singleton)

PDA seed: `[b"pricing"]`.

```rust
pub struct PricingConfig {
  pub authority: Pubkey,             // multi-sig pubkey
  pub usdc_mint: Pubkey,             // EPjFWdd5...
  pub fee_notarize: u64,             // micro-USDC; 1_000_000 = 1 USDC
  pub fee_threshold_escrow: u64,
  pub fee_extra_signer: u64,
  pub treasury: Pubkey,              // ATA owned by program
  pub bump: u8,
}
```

### `DocumentRegistry` (compressed)

```rust
pub struct DocumentRegistry {
  pub document_id: [u8; 16],         // ULID bytes
  pub canonical_hash: [u8; 32],      // SHA-256 of canonical PDF
  pub owner: Pubkey,
  pub workspace_id: [u8; 16],
  pub created_at: i64,
  pub status: DocumentStatus,        // Awaiting | Partial | Completed | Declined
  pub required_signers: u8,
  pub completed_signers: u8,
  pub merkle_root: Option<[u8; 32]>, // root of all signature attestations once complete
}
```

### `SignatureAttestation` (compressed)

```rust
pub struct SignatureAttestation {
  pub document_id: [u8; 16],
  pub signer: Pubkey,
  pub signature: [u8; 64],           // ed25519 sig over signing message
  pub message_hash: [u8; 32],        // SHA-256 of canonical signing message
  pub timestamp: i64,
  pub kind: AttestationKind,         // Sign | Decline | NotaryCounterSign
}
```

### `EscrowVault` (regular)

PDA seed: `[b"escrow", document_id]`.

```rust
pub struct EscrowVault {
  pub document_id: [u8; 16],
  pub usdc_balance: u64,
  pub feature: PremiumFeature,
  pub claimed: bool,
  pub bump: u8,
}
```

### `AgentDelegation` (compressed) — v1.1

Compressed account; addressable by `delegation_id = SHA-256(principal || nonce)[..16]`.

```rust
pub struct AgentDelegation {
  pub delegation_id: [u8; 16],
  pub principal: Pubkey,             // human signer
  pub agent: Pubkey,                 // agent keypair (e.g., MCP-managed)
  pub scope_hash: [u8; 32],          // SHA-256 of canonical scope JSON in R2
  pub expires_at: i64,               // unix seconds; ≤ now + 30d
  pub nonce: [u8; 32],
  pub principal_sig: [u8; 64],       // ed25519 over canonical delegation message
  pub status: DelegationStatus,      // Active | Revoked | Expired (lazy)
  pub created_at: i64,
  pub revoked_at: Option<i64>,
}

pub enum DelegationStatus {
  Active,
  Revoked,
  Expired,
}
```

### `AgentAction` (compressed) — v1.1

Compressed account; one per agent tool invocation.

```rust
pub struct AgentAction {
  pub action_id: [u8; 16],           // ULID bytes
  pub delegation_id: [u8; 16],
  pub action_kind: ToolId,           // matches ToolManifest entry
  pub target_id: [u8; 32],           // SHA-256: doc hash for sign; doc_id-hash for verify
  pub agent_sig: [u8; 64],           // ed25519 over canonical action message
  pub principal_sig_witness: Option<[u8; 64]>, // required iff spend > scope cap
  pub timestamp: i64,
  pub slot: u64,
}
```

### `ToolManifest` (regular, singleton) — v1.1

PDA seed: `[b"tool-manifest"]`. Updated only by program upgrade authority (multi-sig).

```rust
pub struct ToolManifest {
  pub authority: Pubkey,
  pub version: u8,
  pub tools: Vec<ToolEntry>,
  pub bump: u8,
}

pub struct ToolEntry {
  pub id: ToolId,                    // 32-byte canonical tool name (e.g., "sign_document")
  pub max_spend_micro_usdc: u64,     // 0 = read-only
  pub enabled: bool,
}

pub enum ToolId {
  Delegate,
  SignDocument,
  Verify,
  Revoke,
  // future tools require a program upgrade
}
```

## Instructions

### `initialize_pricing(args: InitializePricingArgs)`

- Signers: program upgrade authority (multi-sig).
- Effect: creates singleton `PricingConfig`. One-time.

### `register_document(args: RegisterDocumentArgs)`

- Signers: document owner.
- Effect: writes a compressed `DocumentRegistry` account.
- Verifier checks (on-chain):
  - `args.canonical_hash.len() == 32`
  - `args.required_signers >= 1 && args.required_signers <= 50`
  - signer pays a small SOL fee (≤0.001) for tree append.

### `attest_signature(args: AttestSignatureArgs)`

- Signers: the signing recipient.
- Effect: writes a compressed `SignatureAttestation`. Updates the parent `DocumentRegistry.completed_signers`.
- On reaching `required_signers`: auto-derives `merkle_root` and sets `status = Completed`.
- Verifier checks (on-chain):
  - `args.message_hash` matches canonical reconstruction:
    `SHA-256("YourSign v1\nDocument: {filename}\nHash (SHA-256): {hex}\nSigner: {pubkey}\nTimestamp (UTC): {iso8601}\nWorkspace: {workspace_id}\nNonce: {nonce}\n")`
  - `ed25519_verify(args.signature, args.message_hash, signer)` ✓
  - `signer` is in the document's expected signer list (Merkle proof against off-chain manifest, anchored at registration via a `signer_root: [u8; 32]` field — to be added in v1.1).

### `attest_decline(args: AttestDeclineArgs)`

- Signers: the signing recipient.
- Effect: writes `SignatureAttestation { kind: Decline }`. Sets parent status `Declined`.

### `pay_for_premium(args: PayForPremiumArgs)`

- Signers: the paying owner.
- Effect: transfers USDC into `EscrowVault` for the document; emits `PremiumPaid` event.
- Verifier:
  - `amount >= PricingConfig.fee_<feature>`.
  - SPL token mint is `pricing.usdc_mint`.
  - `EscrowVault.claimed == false`.

### `notarize_counter(args: NotarizeCounterArgs)`

- Signers: notary keypair (whitelisted).
- Effect: writes `SignatureAttestation { kind: NotaryCounterSign }`.
- Pre-condition: corresponding `EscrowVault` for `feature: Notarize` is funded; instruction marks it `claimed = true` and transfers USDC to `treasury`.

### `register_agent(args: RegisterAgentArgs)` — v1.1 (ADR-0007)

- Signers: principal (the human delegator). Must match `args.principal`.
- Effect: writes a compressed `AgentDelegation` account with `status = Active`.
- On-chain checks:
  - PDA seed `[b"delegation", args.principal, args.nonce]` not already used (replay protection).
  - `args.expires_at <= clock.unix_timestamp + 30 * 24 * 3600` else `DelegationLifetimeTooLong`.
  - Reconstructs canonical delegation message bytes (ADR-0007 §"Canonical delegation message") from args; computes SHA-256.
  - Calls Solana `ed25519_program` syscall to verify `args.principal_sig` over the canonical message hash for `args.principal`. Failure → `BadSignature`.
  - `args.scope_hash` is stored verbatim; off-chain JSON validation is the verifier's job (deterministic re-hash).
- Emits `AgentDelegated`.

### `attest_agent_action(args: AttestAgentActionArgs)` — v1.1 (ADR-0007)

- Signers: the agent keypair (`AgentDelegation.agent`).
- Effect: writes a compressed `AgentAction`.
- On-chain checks:
  - Loads `AgentDelegation` by `args.delegation_id`. Status MUST be `Active`. Else `DelegationRevoked` or `DelegationExpired`.
  - `clock.unix_timestamp < AgentDelegation.expires_at` else lazy-flips status to `Expired` and returns `DelegationExpired`.
  - Loads `ToolManifest`. `args.action_kind` MUST be present AND `enabled == true`. Else `ToolNotInManifest` / `ToolDisabled`.
  - Reconstructs canonical action message bytes; SHA-256.
  - `ed25519_program` verify of `args.agent_sig` over canonical action hash for `AgentDelegation.agent`. Failure → `BadSignature`.
  - If `args.spend_micro_usdc > 0`:
    - `args.spend_micro_usdc <= ToolManifest.tools[i].max_spend_micro_usdc` else `ToolSpendCapExceeded`.
    - If `args.spend_micro_usdc > scope.cap` (anchored via `scope_hash` — full check off-chain at consumer; on-chain we require an inline `principal_sig_witness` whenever `spend > 0`), fail `SpendCapExceeded` if witness absent. Verify witness sig.
  - For `action_kind == SignDocument`: this ix must be CPI'd from / co-tx'd with `attest_signature` over the same `target_id`. Enforce via `instruction-introspection` (`solana-program::sysvar::instructions`).
- Emits `AgentActionAttested`.

### `revoke_delegation(args: RevokeDelegationArgs)` — v1.1 (ADR-0007)

- Signers: principal (matches `AgentDelegation.principal`).
- Effect: flips `AgentDelegation.status = Revoked` and stamps `revoked_at = clock.unix_timestamp`.
- On-chain checks:
  - `AgentDelegation.status == Active` else `AlreadyRevoked` / `DelegationExpired`.
  - Reconstructs canonical revocation message: `"YourSign Agent Revoke v1\nDelegation: {delegation_id}\nNonce: {nonce}"`. SHA-256.
  - `ed25519_program` verify of `args.principal_sig` over the hash. Failure → `BadSignature`.
- Emits `AgentDelegationRevoked`.

### `init_tool_manifest(args: InitToolManifestArgs)` — v1.1 (ADR-0007)

- Signers: program upgrade authority (multi-sig).
- Effect: creates / updates the singleton `ToolManifest`. Append-only for `tools`; existing entries can flip `enabled` but not change `id` or shrink `max_spend_micro_usdc`.

## Events (emitted via `emit!`)

```rust
#[event] pub struct DocumentRegistered { pub document_id: [u8; 16], pub owner: Pubkey }
#[event] pub struct SignatureAttested { pub document_id: [u8; 16], pub signer: Pubkey, pub kind: AttestationKind }
#[event] pub struct DocumentCompleted { pub document_id: [u8; 16], pub merkle_root: [u8; 32] }
#[event] pub struct PremiumPaid { pub document_id: [u8; 16], pub feature: PremiumFeature, pub amount: u64 }
#[event] pub struct NotaryCounterSigned { pub document_id: [u8; 16], pub notary: Pubkey }
#[event] pub struct AgentDelegated { pub delegation_id: [u8; 16], pub principal: Pubkey, pub agent: Pubkey, pub expires_at: i64 }
#[event] pub struct AgentActionAttested { pub action_id: [u8; 16], pub delegation_id: [u8; 16], pub action_kind: ToolId, pub target_id: [u8; 32] }
#[event] pub struct AgentDelegationRevoked { pub delegation_id: [u8; 16], pub principal: Pubkey, pub revoked_at: i64 }
```

## Error codes

```rust
#[error_code]
pub enum YourSignError {
  #[msg("invalid hash length")] InvalidHashLength,
  #[msg("ed25519 verification failed")] BadSignature,
  #[msg("signer not authorized for this document")] SignerNotAuthorized,
  #[msg("document already completed")] AlreadyCompleted,
  #[msg("payment below required amount")] InsufficientPayment,
  #[msg("escrow already claimed")] EscrowAlreadyClaimed,
  #[msg("notary not whitelisted")] NotaryNotWhitelisted,

  // Agent identity (v1.1, ADR-0007)
  #[msg("delegation lifetime exceeds maximum (30d)")] DelegationLifetimeTooLong,
  #[msg("delegation has been revoked")] DelegationRevoked,
  #[msg("delegation expired")] DelegationExpired,
  #[msg("delegation already revoked")] AlreadyRevoked,
  #[msg("scope_hash mismatch with off-chain JSON")] ScopeHashMismatch,
  #[msg("tool id not present in manifest")] ToolNotInManifest,
  #[msg("tool disabled in manifest")] ToolDisabled,
  #[msg("spend exceeds tool manifest cap")] ToolSpendCapExceeded,
  #[msg("spend exceeds scope cap and no principal witness sig")] SpendCapExceeded,
  #[msg("agent action requires accompanying signature attestation in same tx")] MissingCoSignAttestation,
}
```

## Upgrade authority

Program is deployed with the upgrade authority set to a 3-of-5 Squads multi-sig. (Created in Phase 0.)

## Test plan

- Anchor's `bankrun` for unit tests on each ix.
- `solana-test-validator` for integration tests including USDC transfers (use the `spl-token` mock or a fork of mainnet's USDC mint via `AccountsCloner`).
- Property-based: signing message canonical reconstruction MUST be byte-identical for `(client, on-chain)` pair.
