# ADR-0007 — Agent identity model: on-chain delegation, scoped attestation, revocable

- Status: **Accepted** (2026-05-08)
- Deciders: founding team
- Tags: identity, agents, on-chain, security
- Related: ADR-0002 (Solana + ZK Compression), ADR-0006 (Wallet + SIWS), spec §10

## Context

The hackathon thesis pivoted to *agentic signing*: an AI agent (Claude Desktop, MCP client, autonomous worker) acts on behalf of a human and produces signatures that are **legally and cryptographically distinguishable** from the principal's own. A human never types their seed into Claude — instead the human delegates a **scoped, revocable, time-boxed authority** to an agent keypair, and every agent action is attested on-chain so a verifier can prove:

1. *Who* the agent was (its pubkey).
2. *Who* delegated to it (the principal's pubkey + signature).
3. *What scope* the delegation granted (which tools, which document set, which spend cap).
4. *When* the action occurred (slot + clock).
5. *Whether* the delegation was still active at action-time (no revocation prior).

Existing OAuth/JWT models fail (3) and (5) — they can't be audited without our backend. Smart-contract wallets (Squads, Realms) solve (3) but at multi-sig latency and program complexity that overshoots a 4-day hackathon window.

## Options considered

1. **On-chain `AgentDelegation` compressed account + Ed25519 attestation per action (this ADR).**
2. **Off-chain JWT signed by principal, presented to backend.** Loses verifier-without-backend property (AC-5.1.2). Rejected.
3. **Smart-contract wallet (Squads SDK).** Strong, but requires a separate program per principal and 2-week integration. Over-budget.
4. **Session keys via SPL token-extensions delegate.** Ties scope to a token; semantics don't fit document-signing scope (tools, spend cap). Rejected.
5. **Capability tokens (macaroons) anchored as memos.** Rejected: memos aren't queryable without an indexer; verifier site needs deterministic on-chain reads.

## Decision

Introduce three compressed accounts on the `yoursign` program:

- **`AgentDelegation`** — the principal's signed grant: `{ principal, agent, scope, expires_at, nonce, principal_sig }`.
- **`AgentAction`** — every action the agent performs: `{ delegation_id, action_kind, target_id, agent_sig, principal_sig_witness, slot }`.
- **`ToolManifest`** — declarative list of tool IDs the program recognizes (e.g., `sign_document`, `verify`, `revoke`). On-chain whitelist; updated only by the program upgrade authority.

Three new instructions:

- `register_agent` — writes a new `AgentDelegation`. Verifies the principal's Ed25519 signature over the canonical delegation message **on-chain** (Solana's `ed25519_program` syscall).
- `attest_agent_action` — writes an `AgentAction`. On-chain checks: (a) `AgentDelegation` is not expired, (b) `action_kind` ∈ delegation.scope.tools, (c) Ed25519 verify of `agent_sig` over the canonical action message, (d) `target_id` matches scope predicate (e.g., a document hash whitelist).
- `revoke_delegation` — flips `AgentDelegation.status = Revoked` after verifying the principal's revocation signature. Once revoked, all subsequent `attest_agent_action` calls citing this delegation fail with `DelegationRevoked`.

### Canonical delegation message

```
YourSign Agent Delegation v1
Principal: {principal_pubkey}
Agent: {agent_pubkey}
Scope:
  Tools: {tool_id_1, tool_id_2, ...}
  Documents: {doc_predicate}     # "any" | hash list | workspace_id
  SpendCap (USDC, micro): {n}
  Expires (UTC): {iso8601}
Nonce: {nonce}
```

UTF-8, LF newlines, no BOM. Signed off-chain by the principal (Phantom `signMessage`). Hash = SHA-256 of canonical bytes.

### Canonical action message

```
YourSign Agent Action v1
Delegation: {delegation_id}
Action: {tool_id}
Target: {target_id}            # document_hash for sign; doc_id for verify; nonce for revoke
Timestamp (UTC): {iso8601}
Nonce: {nonce}
```

### Scope schema (off-chain JSON, anchored as 32-byte hash on-chain)

```ts
type AgentScope = {
  tools: ToolId[];               // ['sign_document', 'verify']
  documents: 'any' | { hashes: string[] } | { workspaceId: string };
  spendCapMicroUsdc: number;     // 0 = read-only
  expiresAt: string;             // ISO 8601 UTC
};
```

The on-chain `AgentDelegation` stores `scope_hash: [u8; 32]` (SHA-256 of canonical JSON). The full scope JSON travels alongside the delegation off-chain (R2 + signed URL); verifier fetches and re-hashes to confirm.

## Why

- **Verifier-without-backend (AC-5.1.2 stays intact).** A judge can read `AgentDelegation` + `AgentAction` from a public Solana RPC and reconstruct legitimacy.
- **Compressed accounts.** ZK-compressed via Light Protocol → cost stays under AC-4.2.2's $0.001/sig budget for agent attestations too.
- **Ed25519 native.** No new curve, no zk-circuit. Anchor's `ed25519_program` CPI gives us on-chain verification cheaply.
- **Revocation as state-machine flip.** No off-chain blocklist. Once `Revoked`, the program rejects further actions atomically.
- **Per-action principal-signature-witness (optional).** For high-value actions (`spendCap` exceeded, or document outside scope hashes), the program can require an inline principal signature in the same tx — escalation path without breaking the model.

## Why NOT the alternatives

- **JWT.** Verifier needs us. Fatal.
- **Squads multi-sig.** Tx-per-delegation costs scale wrong; UX adds wallet round-trips per action.
- **Token-extension delegates.** Couples authority to a token; we don't mint a token for this.
- **Macaroons / off-chain capability tokens.** Verifier still needs an indexer; loses on-chain audit narrative.

## Consequences

- **`programs/yoursign`** gains 3 ix + 3 accounts (compressed). See `docs/contracts/on-chain-program.md` v1.1.
- **`packages/agent-sdk`** (new) owns the canonical delegation/action message builders, scope hashing, signature verification. Consumed by `apps/mcp`, `apps/web`, `apps/verifier`.
- **`apps/mcp`** (new Cloudflare Worker) exposes 4 MCP tools that wrap the on-chain calls.
- **`apps/web`** must add a "Delegate to agent" UI: principal reviews scope JSON, signs canonical message via Phantom.
- **Revocation latency** = one Solana confirmed tx (~400ms on mainnet at p50). Document this in the demo script.
- **Replay protection.** Delegation nonce is a 32-byte random. On-chain dedup via PDA seed `[b"delegation", principal, nonce]`.
- **Storage.** Scope JSON stored in R2 keyed by `scope_hash`. Cloudflare cache TTL 24h; stale-while-revalidate ok because hash binds content.

## Reversal cost

**Medium.** Migrating principals' active delegations would require `revoke_delegation` + re-`register_agent` under a new schema. Acceptable because we expect <200 active delegations during hackathon. Mainnet deploy is upgrade-authority gated (3-of-5 Squads multi-sig per ADR's defaults), so an emergency schema change is achievable in <24h.

## Security review hooks

This ADR triggers `harness/verifiers/no-secret-leak.md` review for:
- `packages/agent-sdk/**`
- `programs/yoursign/src/instructions/{register_agent,attest_agent_action,revoke_delegation}.rs`
- `apps/mcp/src/**`
- `apps/api/src/auth/agent.rs` (when added)

Mandatory Security Analyst delegation (Gemini 2.5 Pro) before merge of any of the above.

## Open questions tracked elsewhere

- **Q1.** Whether to anchor `principal_sig` bytes inline (96B/delegation) or only its hash (32B). → Answered in `docs/contracts/on-chain-program.md` v1.1: anchor full sig (auditability over 64B savings).
- **Q2.** Tool manifest update cadence. → Whitelisted at deploy; new tools require a program upgrade (multi-sig).
- **Q3.** Do agents pay their own tx fees? → Yes. Agent keypair is funded by principal at delegation time (0.005 SOL refresh on attestation if balance < 0.001).
