# Sprint 4 — Mainnet agent demo + Colosseum submission (pivot)

**Goal**: Ship the agent flow to mainnet, record the 90-second demo, submit to Colosseum.

**Pivot note** (2026-05-08): Hackathon centerpiece is the agentic signing demo (ADR-0007, spec §10.5). USDC premium path stays descoped from Sprint 3 unless we recover slack on Tuesday.

**Methodology**: Google Design Sprint compressed (4 days plus submission)

**Duration**: 4 days

**Validation gate (Friday)**: Submission posted on Colosseum portal with live URL, video, ≥5 mainnet `AgentAction` tx hashes, and a one-page brief that names ADR-0007/0008 and spec §10 explicitly.

---

## Monday — Understand

**Activities**:

- Audit audit-event coverage vs. `docs/contracts/events.md`. Every state transition emits the right type.
- Lighthouse audit on `apps/web` and `apps/verifier`. Identify gaps to AC-8.* targets.
- Read `docs/05-hackathon-strategy.md` and align team on judging axes.
- Decide mainnet readiness (program upgrade authority multi-sig approved? Funded?).

---

## Tuesday — Diverge

**Activities**:

- Sketch the **90-second agent demo** frame-by-frame:
  - 0:00–0:10 — Claude Desktop with MCP server connected. Principal types: "Mariana sent invoice $35 — sign it."
  - 0:10–0:25 — Claude calls `yoursign.delegate({ tools: ['sign_document'], spendCap: 0, expiresAt: '+24h' })`. Phantom popup appears. Principal signs.
  - 0:25–0:40 — Solana Explorer in split-view shows the `AgentDelegation` tx confirming on mainnet.
  - 0:40–0:60 — Claude calls `yoursign.sign_document({ documentHash })`. Single tx with `AgentAction` + `SignatureAttestation`. Explorer updates.
  - 0:60–0:75 — `apps/verifier` (different browser, no auth) resolves the document, shows the signature **and** the agent-delegation provenance. No backend in the call path.
  - 0:75–0:90 — Principal types "revoke that agent". Claude calls `yoursign.revoke`. Subsequent `sign_document` attempt fails with `DelegationRevoked` shown live.
- Sketch one-page submission brief (matches `docs/milestones/hackathon-submission.md` template); cite ADR-0007/0008, spec §10 ACs hit.
- Sketch hero shots for landing — agentic signing as the headline.
- (Recovery slot) If Sprint 3 ran ahead: revisit USDC premium path; otherwise keep descoped.

---

## Wednesday — Decide

**Decisions to lock**:
- Final domains: `yoursign.tech` (web), `verify.yoursign.tech` (verifier), `api.yoursign.tech` (api), `mcp.yoursign.tech` (MCP server).
- Mainnet program-id (locked + recorded in `programs/yoursign/Anchor.toml` + `packages/solana-sdk/src/constants.ts`).
- Multi-sig signers for upgrade authority (3-of-5 Squads if achievable; else 2-of-3 documented in ADR).
- Demo URL with a seeded sample document AND a seeded agent delegation expiring shortly after submission window.
- Submission narrative cites spec §10 + ADR-0007 + ADR-0008 + ≥5 mainnet `AgentAction` tx hashes.
- Launch announcement copy (Twitter, Show HN, Reddit r/solana, Colosseum Discord).

---

## Thursday — Prototype

**Activities**:

- `apps/api`:
  - Audit-bundle export endpoint (`GET /documents/:id/audit-bundle`) (AC-7.2.*) — bundle now includes `AgentAction` + `AgentDelegation` records when present.
- `apps/web` + `apps/verifier`:
  - PT-BR copy review (run `marketing-skills:copy-editing` skill). Agent delegation strings reviewed.
  - A11y pass — ≥AA (AC-8.2.1 — Lighthouse a11y ≥95).
- `apps/mcp` (mainnet cut):
  - Cloudflare Worker deploy at `mcp.yoursign.tech`.
  - `wrangler secret` for agent keypair store + AI Gateway token.
  - Public `mcp.json` manifest URL for Claude Desktop installation.
- Mainnet deployment:
  - Multi-sig signs program upgrade with v1.1 (agent ix set).
  - `init_tool_manifest` ix executed once via multi-sig.
  - Verifier site points to mainnet.
  - First five real `AgentAction` mainnet attestations captured for the demo (AC-10.5.2).
- Demo video recorded (≤90s) — Loom + Hyperframes.

---

## Friday — Validate (submission day)

**Activities**:

- Submit to Colosseum portal:
  - Live URL: `yoursign.tech`
  - Verifier URL: `verify.yoursign.tech`
  - MCP URL: `mcp.yoursign.tech` (with manifest installation steps in README)
  - Repo: `github.com/YourSignAI/core` (public, Apache-2.0)
  - Demo video link (90s agent flow)
  - One-page brief citing ADR-0007/0008 + spec §10
  - On-chain proof: ≥5 mainnet `AgentAction` tx hashes + ≥1 `AgentDelegationRevoked`
- Founder monitors:
  - Signups, on-chain attestation count, agent delegation count, support DMs (09:00–18:00 BRT).
  - Cost per attestation tracker still ≤$0.001 p99 across both signature and agent action types.
  - AI Gateway daily spend < $50 cap.
- Sprint 4 retro:
  - What worked, what didn't.
  - Post-hackathon roadmap commitment (USDC payments path back on the table).

**Friday gate**: see top of file.

## Out of scope (post-hackathon)

- ICP-Brasil real notary integration.
- Mobile PWA + biometric unlock.
- Bulk template flows.
- DOCX ingestion.
- ER-based live co-signing (MagicBlock).
