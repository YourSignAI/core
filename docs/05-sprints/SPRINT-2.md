# Sprint 2 — Encryption + Sign + Anchor (the heart)

**Goal**: 2-party signing flow, attestation visible on Solana Explorer, completed PDF downloadable with audit appendix.

**Methodology**: Google Design Sprint

**Duration**: 5 days (highest-stakes sprint)

**Validation gate (Friday)**:
1. Two real wallets sign a real PDF; attestations exist as compressed accounts on devnet (AC-4.2.1).
2. Per-attestation cost p99 ≤ $0.001 (AC-4.2.2) — measured by `harness/runs/cost-per-signature.json`.
3. Server NEVER held plaintext (AC-3.2.1) — verified by static scan + log review.
4. Completed PDF embeds visible signatures + audit appendix linking to Solana Explorer (AC-4.3.2).

⚠️ **Gating rule**: Crypto + on-chain code REQUIRES Architect (`harness/prompts/architect.md`) + Security Analyst (delegate Gemini 2.5 Pro) sign-off before merge.

---

## Monday — Understand

**Activities**:

- Audit `@lightprotocol/stateless.js`: which CPIs are required for compress/decompress, what's the perf envelope, where does the bundler sit.
- Audit libsodium Ed25519↔X25519 conversion. Decide on domain separation prefix (`yoursign-x25519-v1`).
- Re-read ADR-0002, ADR-0004 carefully.
- Decide canonical signing message bytes (UTF-8 BOM? Newlines? See AC-4.1.1).
- Write `docs/runbooks/CRYPTO-REVIEW.md` — checklist for crypto PR review.

---

## Tuesday — Diverge

**Activities**:

- Sketch on-chain account layout: `DocumentRegistry`, `SignatureAttestation`, `EscrowVault`, `PricingConfig` (decision pre-locked in `docs/contracts/on-chain-program.md`; this is implementation sketch).
- Sketch DEK wrap/unwrap flow with multi-recipient envelope.
- Sketch worker anchoring: when does it run, retry policy, fallback to uncompressed under `LIGHT_PROTOCOL_DEGRADED`.
- Sketch the recipient flow: open magic link → connect wallet → unwrap DEK → decrypt → sign → write attestation.

---

## Wednesday — Decide

**Decisions to lock**:
- Anchor instruction signature shapes (final).
- Crypto domain separation tag + version.
- Compressed Merkle tree config (depth, buffer size).
- Worker concurrency (start at 1).
- Audit appendix format (page, fields shown, Solana Explorer link template).

---

## Thursday — Prototype

**Activities**:

- `programs/yoursign`:
  - `register_document`
  - `attest_signature`
  - `attest_decline`
  - `complete_document`
  - Bankrun unit tests for each ix.
- `packages/crypto`:
  - AES-256-GCM seal/open
  - X25519 wrap/unwrap (with domain separation)
  - Ed25519 verify (consumed by verifier site too)
  - KAT tests.
- `apps/worker`:
  - `anchor-document` job (calls `register_document`)
  - `anchor-signature` job (calls `attest_signature`)
  - Retry with exponential backoff + DLQ.
- `apps/web`:
  - Sign prompt (Screen 4 from prototype).
  - Phantom `signMessage` integration.
  - Audit appendix embedding (`pdf-lib`).
- `packages/pdf-engine`:
  - `embedSignatures(plaintext, visualSigs, appendix)`.

---

## Friday — Validate

**Activities**:

- Live 2-party demo on devnet. Open Solana Explorer with the attestation tx hashes. Show compressed account contents.
- Run cost measurement script against 100 attestations; output `harness/runs/cost-per-signature.json`.
- Scan logs and code for plaintext exposure (`harness/verifiers/no-secret-leak.md` + extra grep for "plaintext"-named identifiers).
- Audit appendix on the downloaded PDF must show 2 signers + 2 tx links + canonical hash.

**Friday gate**: see top of file.

If gate fails: write ADR explaining the gap + replan into Sprint 3 Monday + halt non-critical paths.

## Out of scope

- USDC payments (Sprint 3).
- ICP-Brasil real notary integration (post-MVP).
- Mainnet deployment (Sprint 4).
