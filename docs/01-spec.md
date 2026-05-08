# 01 — System Spec (SDD)

> **Spec-driven development contract.** Every numbered acceptance criterion (`AC-N.M.k`) is **falsifiable** — a test or verifier can mechanically prove it true or false. If you can't write the test, the spec is wrong, not the code.

Status legend: 🔴 not started · 🟡 in progress · 🟢 done · ⚪ deferred to post-MVP.

---

## 1. Document upload & canonicalization

**Goal.** A user uploads a PDF; the system produces a deterministic *canonical hash* that survives field annotations.

### Acceptance criteria

- 🔴 **AC-1.1.1** — System accepts `application/pdf` up to 25 MB.
- 🔴 **AC-1.1.2** — System rejects encrypted PDFs (`/Encrypt` dictionary present) with error code `PDF_ALREADY_ENCRYPTED`.
- 🔴 **AC-1.2.1** — Given a PDF P, the canonical form `canon(P)` is byte-stable across uploads of the same file (no embedded timestamps, no random IDs).
- 🔴 **AC-1.2.2** — `hash(P) = SHA-256(canon(P))` is logged in the document record and is the **only** identifier shown to signatories.
- 🔴 **AC-1.3.1** — Field detection identifies signature, initial, and date fields with **precision ≥0.85** on the test corpus (`packages/pdf-engine/test/fixtures/`).
- 🔴 **AC-1.3.2** — Manual field overrides are persisted as `FieldOverride` records and replayed deterministically.

### Out of scope (this section)

- DOCX, image formats — post-MVP. (⚪)
- Form filling beyond signature/initial/date — post-MVP. (⚪)

---

## 2. Identity & wallet binding

**Goal.** Bind a human-meaningful identity to a Solana public key without exposing private material to the platform.

### Acceptance criteria

- 🔴 **AC-2.1.1** — User can connect Phantom, Backpack, or Solflare via the Wallet Adapter standard. (Reference: prototype Screen 3.)
- 🔴 **AC-2.1.2** — User can authenticate with email/Google/Apple via Privy MPC, which provisions an embedded Solana wallet without exposing a seed phrase.
- 🔴 **AC-2.2.1** — On first authentication, the system records `Identity { pubkey, displayName, email?, kycLevel }` where `kycLevel ∈ {none, email_verified, icp_brasil}`.
- 🔴 **AC-2.2.2** — A pubkey can hold multiple identities only if cryptographically proved by signing a binding message. (One pubkey ↔ one canonical identity per workspace.)
- 🔴 **AC-2.3.1** — System NEVER stores a private key, mnemonic, or unencrypted MPC shard. (Verified by static scan: see `harness/verifiers/no-secret-leak.md`.)
- 🔴 **AC-2.3.2** — Authenticating to the platform itself uses **Sign-In with Solana** (SIWS, off-chain message + nonce), not OAuth bearer tokens.

---

## 3. Document encryption

**Goal.** Document content is unreadable to the platform; only signatories can decrypt.

### Acceptance criteria

- 🔴 **AC-3.1.1** — When a sender invites recipients, the client generates a fresh **document encryption key** (DEK, 256-bit AES-GCM).
- 🔴 **AC-3.1.2** — The DEK is wrapped per recipient using **X25519** key agreement against each recipient's Solana-derived encryption key (Ed25519 → X25519 via `crypto_sign_ed25519_pk_to_curve25519`).
- 🔴 **AC-3.1.3** — Ciphertext is uploaded to Arweave/Irys; the platform stores only the ciphertext URL + per-recipient wrapped keys.
- 🔴 **AC-3.2.1** — A recipient with their wallet can decrypt the document with **zero round-trips to platform servers** (server-fetched data MUST be insufficient to decrypt).
- 🔴 **AC-3.2.2** — Verifier can validate the SHA-256 of the *plaintext* without ever holding the plaintext, by comparing recipient-decrypted hash to on-chain attestation.
- 🔴 **AC-3.3.1** — Threshold mode: documents may use a 2-of-3 threshold scheme via Lit Protocol or equivalent for escrow/notary tiers. (Premium tier only.)

---

## 4. Signing flow

**Goal.** Each signatory produces a cryptographic, on-chain-anchored signature.

### Acceptance criteria

- 🔴 **AC-4.1.1** — System constructs a canonical signing message:
  ```
  YourSign v1
  Document: {filename}
  Hash (SHA-256): {hex}
  Signer: {pubkey}
  Timestamp (UTC): {iso8601}
  Workspace: {workspace_id}
  Nonce: {nonce}
  ```
- 🔴 **AC-4.1.2** — Signer approves via wallet's `signMessage` — **off-chain, zero gas, zero lamports**. (Matches prototype Screen 4 fee row.)
- 🔴 **AC-4.2.1** — Within ≤5s of signing, the platform writes a **compressed account attestation** to Solana via Light Protocol containing: `{document_hash, signer_pubkey, signature, timestamp, message_id}`.
- 🔴 **AC-4.2.2** — Attestation cost MUST be ≤$0.001 per signature at p99. (Verified by metric `harness/runs/cost-per-signature.json`.)
- 🔴 **AC-4.3.1** — Once all required signatures are collected, the platform updates the document state to `completed` and emits a final `DocumentCompleted` event with the Merkle root of all signatures.
- 🔴 **AC-4.3.2** — The completed PDF embeds a visible signature block + a final-page audit appendix linking to the on-chain attestations.
- 🔴 **AC-4.4.1** — A signatory can decline; the system records a signed `SignatureDeclined` attestation and notifies the sender.

---

## 5. Verification (read-only, public)

**Goal.** Anyone can verify a signature without our servers.

### Acceptance criteria

- 🔴 **AC-5.1.1** — Public verifier site (`apps/verifier`) accepts a PDF + a document ID and returns:
  - whether all attestations exist on-chain,
  - whether the canonical hash matches,
  - the audit timeline.
- 🔴 **AC-5.1.2** — Verification uses **public Solana RPC only** — no YourSign backend in the path.
- 🔴 **AC-5.2.1** — A CLI (`packages/solana-sdk/bin/verify.ts`) reproduces the same result given a PDF + document ID, for offline auditors.

---

## 6. Payments (USDC via Solana Pay)

**Goal.** Premium tiers settle in USDC; free tier never sees a paywall for base signing.

### Acceptance criteria

- 🔴 **AC-6.1.1** — Free tier: unlimited self-signed documents, up to 5 multi-party documents per month per workspace.
- 🔴 **AC-6.1.2** — Premium tier triggers (per-document USDC payment via Solana Pay):
  - notarization-grade attestation (ICP-Brasil counter-signature)
  - >5 signatories on a single document
  - threshold encryption (2-of-3 escrow)
  - team workspace seats above 3
- 🔴 **AC-6.2.1** — Payment URL is a Solana Pay transaction request (`solana:` URI) signed by the on-chain `yoursign` program; reference includes the document ID.
- 🔴 **AC-6.2.2** — On `confirmed` USDC transfer, the document is unlocked for the premium feature within ≤10s.
- 🔴 **AC-6.2.3** — Pricing table is on-chain (program account `PricingConfig`), updatable only by the program upgrade authority via multi-sig.

---

## 7. Audit & compliance

**Goal.** Every state transition is auditable by the user, by the platform, and by an external regulator.

### Acceptance criteria

- 🔴 **AC-7.1.1** — Every state transition emits a typed `AuditEvent`. (Schema: `docs/contracts/events.md`.)
- 🔴 **AC-7.1.2** — `AuditEvent` rows are append-only (DB enforces via trigger).
- 🔴 **AC-7.2.1** — Workspace owner can export an audit bundle (JSON + PDF appendix + on-chain proof links) for a single document.
- 🔴 **AC-7.2.2** — Audit bundle is reproducible: same input → same output bytes (no timestamps in formatting).
- 🔴 **AC-7.3.1** — ICP-Brasil bridge: documents flagged for notarization receive a counter-signature from a partner notary's certified key, and the counter-signature is anchored on-chain.

---

## 8. Performance & availability

### Acceptance criteria

- 🔴 **AC-8.1.1** — p95 upload-to-canonical-hash ≤3s for a 5 MB PDF on a 50 Mbps connection.
- 🔴 **AC-8.1.2** — p95 signature-to-attestation ≤5s.
- 🔴 **AC-8.1.3** — Verifier page p95 LCP ≤2.5s on 4G.
- 🔴 **AC-8.2.1** — Web app passes `vercel-plugin:performance-optimizer` Lighthouse budget (Performance ≥90, A11y ≥95).

---

## 9. Out-of-scope for the hackathon (deferred)

- ⚪ Bulk template flows ("Send to 1000 people").
- ⚪ DOCX/Pages/Markdown ingestion.
- ⚪ ICP-Brasil counter-signature **production** integration (we ship a stubbed bridge with a real schema).
- ⚪ Mobile-native apps (PWA only).
- ⚪ Custom workflow builder.

---

## 10. Agent infrastructure

**Goal.** Humans delegate scoped, revocable, on-chain authority to AI agents (Claude Desktop via MCP, autonomous workers). Every agent action is provable on-chain to a third-party verifier without trusting our backend.

**References.** ADR-0007 (agent identity model), ADR-0008 (AI Gateway routing), `docs/contracts/on-chain-program.md` v1.1.

### 10.1 Delegation

- 🔴 **AC-10.1.1** — Principal can register a new `AgentDelegation` by signing the canonical delegation message (ADR-0007 §"Canonical delegation message") with their wallet's `signMessage`. No private key leaves the principal's device.
- 🔴 **AC-10.1.2** — `AgentDelegation` is written as a **compressed account** on Solana mainnet via Light Protocol; the on-chain record contains `{ principal, agent, scope_hash, expires_at, nonce, principal_sig, status }`.
- 🔴 **AC-10.1.3** — On-chain `register_agent` ix verifies the principal's Ed25519 signature against the canonical message via the Solana `ed25519_program` syscall. Rejected delegations return `BadSignature` and write nothing.
- 🔴 **AC-10.1.4** — Scope JSON (`{ tools, documents, spendCapMicroUsdc, expiresAt }`) is uploaded to R2 keyed by `scope_hash`. Verifier re-hashes the JSON and compares against on-chain `scope_hash`. Mismatch = `ScopeHashMismatch`.
- 🔴 **AC-10.1.5** — Maximum delegation lifetime ≤ 30 days. The program rejects `expires_at` more than 30d in the future with `DelegationLifetimeTooLong`.
- 🔴 **AC-10.1.6** — Delegation cost ≤ $0.001 (compressed account append) — same budget as AC-4.2.2.

### 10.2 Action attestation

- 🔴 **AC-10.2.1** — Every agent action (`sign_document`, `verify`, `revoke`, future tools listed in `ToolManifest`) emits an `AgentAction` compressed account containing `{ delegation_id, action_kind, target_id, agent_sig, slot, timestamp }`.
- 🔴 **AC-10.2.2** — On-chain `attest_agent_action` ix enforces:
  - `AgentDelegation.status == Active`.
  - `AgentDelegation.expires_at > clock.unix_timestamp`.
  - `action_kind ∈ ToolManifest.tools` AND `action_kind ∈ scope.tools` (scope.tools verified via the off-chain JSON whose hash is anchored).
  - `target_id` matches the scope predicate (e.g., `documents.hashes` whitelist).
  - `ed25519_verify(agent_sig, canonical_action_hash, agent_pubkey)` ✓.
- 🔴 **AC-10.2.3** — If `agent_action.spend > scope.spendCapMicroUsdc`, the program requires an inline `principal_sig_witness` over the same action message; absence = `SpendCapExceeded`.
- 🔴 **AC-10.2.4** — A `sign_document` agent action MUST also produce a regular `SignatureAttestation` (per AC-4.2.1). The two records share `target_id == document_hash`. The verifier site shows both: "signed by agent X under delegation from principal Y".
- 🔴 **AC-10.2.5** — Agent actions are queryable from a public Solana RPC by `(delegation_id)` or `(agent_pubkey, slot_range)` — no YourSign backend in the path (preserves AC-5.1.2 for the agentic flow).

### 10.3 Revocation

- 🔴 **AC-10.3.1** — Principal can revoke any of their `AgentDelegation`s by signing a canonical revocation message and submitting `revoke_delegation`. The program flips `AgentDelegation.status = Revoked` after Ed25519 verification.
- 🔴 **AC-10.3.2** — After a successful `revoke_delegation` lands in a confirmed slot, any subsequent `attest_agent_action` citing that delegation MUST fail with `DelegationRevoked`. (Test: revoke at slot N, attempt action at slot N+1 → fails.)
- 🔴 **AC-10.3.3** — Revocation latency ≤ 1 confirmed slot at p95 on mainnet.
- 🔴 **AC-10.3.4** — A revoked delegation cannot be reactivated. Re-establishing authority requires a fresh `register_agent` with a new nonce.
- 🔴 **AC-10.3.5** — Revocation history is permanently visible in the compressed account state. Verifier displays revocation timestamp and citing tx hash.

### 10.4 MCP surface (`apps/mcp`)

- 🔴 **AC-10.4.1** — `apps/mcp` (Cloudflare Worker + Hono + `@modelcontextprotocol/sdk`) exposes exactly four MCP tools: `delegate`, `sign_document`, `verify`, `revoke`. Tool IDs MUST match `ToolManifest` entries on-chain.
- 🔴 **AC-10.4.2** — `delegate` returns a `solana:` URI containing the canonical delegation message. The MCP client (e.g., Claude Desktop) invokes the user's wallet (Phantom mobile/desktop deep-link) to sign. No private key passes through the MCP server.
- 🔴 **AC-10.4.3** — `sign_document` requires a valid `delegation_id` and the document hash; it constructs and submits `attest_agent_action` + `attest_signature` in a single tx. The agent's keypair is loaded from the MCP server's secret store (per-workspace, isolated).
- 🔴 **AC-10.4.4** — `revoke` returns a `solana:` URI for the revocation message. Server never holds the principal's signing material.
- 🔴 **AC-10.4.5** — Each MCP tool call is logged to AI Gateway with metadata `(workspace_id, agent_pubkey, tool_id, doc_id_hash, mcp_session_id)`. Logs retained 90 days in R2 (per ADR-0008).

### 10.5 Demo gate (Sprint 4 Friday)

- 🔴 **AC-10.5.1** — End-to-end demo: Claude Desktop calls `yoursign.delegate` → Phantom signMessage popup → on-chain `AgentDelegation` confirmed → Claude calls `yoursign.sign_document` → on-chain `AgentAction` + `SignatureAttestation` confirmed → `apps/verifier` page shows both records resolved against the off-chain scope JSON → Claude calls `yoursign.revoke` → subsequent `sign_document` attempt fails with `DelegationRevoked` from on-chain.
- 🔴 **AC-10.5.2** — Mainnet deployment of the program with the agent ix set; ≥5 real `AgentAction` records anchored before submission.
- 🔴 **AC-10.5.3** — Demo video ≤ 90 seconds covers the full flow end-to-end with timestamps visible in Solana Explorer.

---

## How to extend this spec

1. Open a PR that adds a new section or a new AC.
2. Reference the AC ID in the implementing commit.
3. The verifier agent rejects PRs whose diff cites an AC that doesn't exist.

## How to mark a section done

A section is 🟢 only when:

- All ACs have a passing automated test.
- The corresponding contract in `docs/contracts/` is published.
- A human reviewer has signed off in the section's `tasks/` file.
