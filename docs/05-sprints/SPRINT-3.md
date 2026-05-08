# Sprint 3 — Public verifier + Agent delegation E2E (pivot)

**Goal**: Anyone can verify a document AND an agent delegation without our backend. End-to-end Claude Desktop → MCP → Phantom signMessage → on-chain `AgentDelegation` flow live on devnet, ready for mainnet cut in Sprint 4.

**Pivot note** (2026-05-08): USDC premium-payments path is descoped to post-MVP. Hackathon thesis sharpens to **agentic signing**: humans grant scoped, revocable, on-chain authority to AI agents. See ADR-0007 (agent identity), ADR-0008 (AI Gateway), spec §10. Original Solana Pay flow (AC-6.*) deferred to post-Colosseum unless time remains in Sprint 4 Tuesday.

**Methodology**: Google Design Sprint

**Duration**: 5 days

**Validation gate (Friday)**:
1. Drop a signed PDF on `verify.staging.yoursign.tech` → all signatures green; on-chain proof links open (AC-5.1.1).
2. CLI `pnpm --filter @yoursign/solana-sdk verify <docId> --pdf path.pdf` produces the same result (AC-5.2.1).
3. Claude Desktop calls `yoursign.delegate` via the deployed `apps/mcp` Worker → Phantom popup → `AgentDelegation` confirmed on devnet within ≤5s (AC-10.1.1, AC-10.1.2, AC-10.1.3).
4. Claude Desktop calls `yoursign.sign_document` against a doc in scope → `AgentAction` + `SignatureAttestation` co-signed in a single tx (AC-10.2.4).
5. Claude Desktop calls `yoursign.revoke` → next `sign_document` attempt fails on-chain with `DelegationRevoked` within ≤1 confirmed slot (AC-10.3.2, AC-10.3.3).

---

## Monday — Understand

**Activities**:

- Audit `@modelcontextprotocol/sdk` server primitives (Tool, Prompt, Resource). Confirm Hono-on-Workers can host a streamable HTTP MCP transport.
- Audit Light Protocol read-only client perf (verifier site MUST work without our backend in the path).
- Audit Solana `ed25519_program` syscall: input layout, max instructions per tx, CU cost. Confirms on-chain delegation+action verify fits in one tx.
- Audit Phantom deep-link signing on desktop (`solana:` URI handler) — gates AC-10.4.2.
- Re-read `docs/01-spec.md §5` and §10. Re-read ADR-0007, ADR-0008.
- Document agent keypair custody model (per-workspace, Cloudflare Workers KV-bound key, never logged).

---

## Tuesday — Diverge

**Activities**:

- Sketch verifier UX. Single page. Drop PDF + paste docId or scan QR. Result list of signers + tx links. **NEW**: also resolves any `AgentAction` records and shows "signed by agent X under delegation Y from principal Z".
- Sketch MCP tool surface (4 tools: delegate, sign_document, verify, revoke). Decide on the JSON schema for tool inputs/outputs (`packages/agent-sdk` exports the types).
- Sketch the canonical action message bytes (already locked in ADR-0007); confirm byte-identical reconstruction client/Worker/on-chain.
- Sketch the `AgentDelegation` register flow: MCP client returns `solana:` URI → desktop OS hands off to Phantom → Phantom returns signed message → MCP server submits `register_agent` ix.

---

## Wednesday — Decide

**Decisions to lock**:
- `ToolManifest` v1 entries: `delegate`, `sign_document`, `verify`, `revoke`. Spend caps locked.
- Default scope template (Claude Desktop demo): `tools=[sign_document,verify]`, `documents="any"`, `spendCapMicroUsdc=0`, `expiresAt=now+24h`.
- Agent keypair custody: per-workspace, generated server-side in `apps/mcp`, private bytes encrypted via Cloudflare Workers Secret + KV, never logged.
- Canonical action message UTF-8/LF; final byte-string locked in `packages/agent-sdk` v0.1.0.
- AI Gateway model defaults (per ADR-0008): `claude-sonnet-4-6` for tool-use, `claude-haiku-4-5` for classifiers, `@cf/meta/llama-3.3-70b-instruct-fp8-fast` fallback.

---

## Thursday — Prototype

**Activities**:

- `apps/verifier`:
  - Drop-PDF UX
  - Recompute hash client-side (`packages/pdf-engine`)
  - Read `DocumentRegistry`, `SignatureAttestation`, `AgentAction`, `AgentDelegation` (Light Protocol read)
  - Verify Ed25519 sigs locally for both signature and agent_sig (`packages/crypto`, `packages/agent-sdk`)
  - Rebuild merkle root, fetch scope JSON from R2 by `scope_hash`, re-hash and compare.
- `packages/solana-sdk/bin/verify.ts` — CLI parity (covers agent flow too).
- `programs/yoursign` (v1.1, ADR-0007):
  - `register_agent`
  - `attest_agent_action`
  - `revoke_delegation`
  - `init_tool_manifest`
  - Bankrun tests for each + ed25519_program syscall integration.
- `packages/agent-sdk`:
  - Canonical message builders (delegation, action, revoke) with KAT tests.
  - Scope JSON schema + Zod validator + `hashScope(scope)` helper.
  - Ed25519 sign/verify thin wrappers over `@noble/ed25519`.
- `apps/mcp` (Cloudflare Worker + Hono + `@modelcontextprotocol/sdk`):
  - `delegate` tool → returns `solana:` URI for principal.
  - `sign_document` tool → builds + submits `attest_agent_action` + `attest_signature` co-tx.
  - `verify` tool → reads on-chain state via Light Protocol RPC and replies with structured proof.
  - `revoke` tool → returns `solana:` URI for principal revocation message.
- `apps/web`:
  - "Delegate to agent" UI (Phantom signMessage + scope JSON preview).
  - Active delegations dashboard with revoke button.
  - Strings PT-BR + EN.
- `apps/api`:
  - `POST /agents/scope` (anchors scope JSON to R2, returns `scope_hash`).
  - `GET /agents/scope/:scope_hash` (replays scope JSON for verifier UI).
  - AI Gateway proxy module (`src/ai/gateway.ts`) per ADR-0008.

---

## Friday — Validate

**Activities**:

- E2E: verify a Sprint 2 PDF on the verifier site and via CLI.
- E2E (agent): Claude Desktop → `delegate` → Phantom signs → on-chain `AgentDelegation` confirmed → `sign_document` → on-chain `AgentAction` + `SignatureAttestation` co-signed → `revoke` → next `sign_document` returns `DelegationRevoked` from-chain.
- Cost measurement: 10 agent actions; per-action total ≤ $0.001 (AC-10.1.6, AC-4.2.2 stay green).
- Lighthouse pass on `apps/verifier` ≥90 (AC-8.2.1).
- AI Gateway log spot-check: every MCP call has `(workspace_id, agent_pubkey, tool_id)` metadata (AC-10.4.5).

**Friday gate**: see top of file.

## Out of scope

- USDC premium-payments flow (Solana Pay) — descoped per pivot; revisit Sprint 4 Tuesday only if timeline allows.
- ICP-Brasil real notary integration (post-MVP).
- Mainnet deploy (Sprint 4).
- Threshold encryption escrow flow (post-MVP).
