# Sprint 1 — Document pipeline + Identity

**Goal**: Drop a PDF, see auto-detected fields, get a deterministic canonical hash, log in with Phantom or Privy email — all on a deployed preview URL.

**Methodology**: Google Design Sprint

**Duration**: 5 days

**Validation gate (Friday)**:
1. Same PDF dropped on two browsers produces byte-identical canonical hashes (AC-1.2.1, AC-1.2.2).
2. Field auto-detection precision ≥0.85 on the test corpus (AC-1.3.1).
3. Phantom login + Privy email login both produce a SIWS session JWT (AC-2.1.1, AC-2.1.2, AC-2.3.2).

---

## Monday — Understand

**Phase**: Audit libraries + spec.

**Activities**:

- Read `pdfjs-dist` and `pdf-lib` API surfaces. Identify the minimum hooks for parsing a PDF and stripping volatile metadata (`/CreationDate`, `/ID`, `/Producer`, `/ModDate`).
- Read `@solana/wallet-adapter-react` + Privy SDK. Map both onto a single `WalletInterface` per ADR-0006.
- Read `docs/01-spec.md §1` and `§2` again. Quote the lines we are implementing.
- Write `docs/02-services/PDF-CANON.md` (or extend `packages/pdf-engine/README.md`) with the algorithm description.

**Artifacts**:
- ADR-0005 finalized.
- ADR-0006 finalized.

---

## Tuesday — Diverge

**Phase**: Sketch.

**Activities**:

- Sketch field detection heuristic (line-anchor proximity + AcroForm names + signature box recognition).
- Sketch SIWS challenge/verify flow including nonce TTL (5 min) and audience binding.
- Sketch the staging-upload window (encrypted-before-persistence shape — AC-3.1.* preamble).

**Artifacts**:
- 2-3 design sketches in PR comments or `docs/sketches/`.

---

## Wednesday — Decide

**Phase**: Lock scope.

**Decisions to lock**:
- Canonicalization frozen at `yoursign.canon.v1`. Algorithm published in `packages/pdf-engine/README.md` and ADR-0005.
- MVP field types: `signature`, `initial`, `date` only.
- SIWS audience: `yoursign.tech` (prod) / `*.vercel.app` or `*.pages.dev` (preview).
- JWT lifetime: 24h. No refresh in MVP — re-SIWS.

---

## Thursday — Prototype

**Phase**: Build.

**Activities**:

- `packages/pdf-engine`:
  - `canonicalize(input) → bytes` (AC-1.2.1)
  - `sha256(input) → hex` (shared with `packages/crypto`)
  - `detectFields(input) → DetectedField[]` (AC-1.3.1)
  - 50-PDF corpus committed under `test/fixtures/`.
- `apps/web`:
  - Landing screen (Screen 1 from prototype).
  - Editor screen (Screen 2 from prototype).
  - Connect modal (Screen 3 from prototype).
  - Compute hash client-side; never upload plaintext.
- `apps/api`:
  - `POST /documents` (AC-1.1.1, AC-1.1.2)
  - `POST /documents/:id/canon` (AC-1.2.2)
  - `POST /auth/siws/challenge` + `POST /auth/siws/verify` (AC-2.3.2)
- `packages/solana-sdk`:
  - Unified `WalletInterface` for Wallet Adapter + Privy.

---

## Friday — Validate

**Activities**:

- Two-browser hash test on the deployed preview.
- Login Phantom + login Privy email; both sessions usable.
- Lighthouse on landing ≥90 perf.

**Friday gate**: see top of file.

If gate fails: ADR + replan into Sprint 2 Monday.

## Carry-over to Sprint 2

- Wallet `signMessage` consumption.
- Encryption pipeline (only the staging-upload window touches `apps/api`; client does the work).

## Out of scope

- Encryption (Sprint 2).
- On-chain anchoring (Sprint 2).
- USDC payments (Sprint 3).
