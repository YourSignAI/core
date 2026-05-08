# 06 — DocuSeal reuse plan

[DocuSeal](https://github.com/docusealco/docuseal) is a 30k+ star, AGPL-3.0 Ruby on Rails monolith for e-signature. We don't fork it — but we **steal its hard-won domain wisdom** and re-implement in TypeScript on a stack better suited to Solana.

## What we reuse — and how

| What | Form of reuse | Where it lands in `core` | Why |
| ---- | ------------- | ------------------------ | --- |
| **Domain model** (`Submitter`, `Submission`, `Template`, `SubmitterField`) | Conceptual port to TypeScript | `packages/core-domain` | Battle-tested data model that maps onto SDD specs cleanly. |
| **State machine** (draft → sent → opened → signed → completed → declined) | Direct port | `packages/core-domain/src/state.ts` | Saves us from re-debugging edge cases (e.g., partial sign, decline-after-sign). |
| **PDF field detection heuristics** | Reference implementation, ported | `packages/pdf-engine/src/detect/*` | DocuSeal's field auto-detection works well; mimic it then improve. |
| **Audit log shape** | Schema port | `docs/contracts/events.md` + `packages/schemas` | Their `submission_events` table is an audit-ready event log. |
| **Email templates** | Copy + structure | `apps/api/src/emails/*.tsx` (React Email) | Good defaults, localized strings worth keeping. |
| **Workflow ordering rules** | Concept port | `packages/core-domain/src/workflow.ts` | Ordered vs. parallel signers — non-trivial logic. |
| **HTML→PDF rendering for completed certificates** | Replace with `pdf-lib` + `react-pdf` | `packages/pdf-engine/src/embed/*` | Their HEXA-PDF Ruby lib has no JS equivalent; we use modern alternatives. |
| **Submission link tokens** (signed magic links) | Concept port, JWT-based | `apps/api/src/links/*` | Already a solved problem. |
| **Field types catalog** (signature, initial, date, text, checkbox, attachment) | Schema port | `packages/schemas/src/fields.ts` | A complete enumeration saves a week of bikeshedding. |

## What we deliberately do NOT reuse

| What | Why not |
| ---- | ------- |
| **Ruby on Rails monolith** | Solana ecosystem is JS/TS-first; mixing Ruby splits the toolchain and the team. |
| **ActiveStorage + S3-only blobs** | We need encrypted blobs on Arweave. The storage layer must be content-addressed and permanent. |
| **Devise / OmniAuth** | We auth with SIWS + Privy. No password store, no OAuth bearer model. |
| **Sidekiq** | Not bad — but we already have BullMQ in the JS stack. Stay homogeneous. |
| **Hexapdf (Ruby PDF lib)** | We use `pdf-lib` (TS) + `pdfjs-dist` (parsing). Smaller surface, browser-friendly. |
| **AGPL surface** | DocuSeal is AGPL-3.0; if we ported their *code*, we'd inherit AGPL. We port *concepts*, ship Apache-2.0. (See AGPL §13 — a clean-room re-implementation from public docs is allowed.) |
| **DocuSeal's centralized signature model** | Our entire thesis is decentralized signatures. Their model is X.509 + database row. Ours is Ed25519 + on-chain attestation. |

## Clean-room protocol

To keep our license clean (Apache-2.0) while reusing concepts from an AGPL-3.0 codebase:

1. **Read DocuSeal's docs and tests, NOT its source code, when designing our equivalents.** Use their public API surface and database schema (visible in `db/schema.rb`) as inspiration.
2. **Document the conceptual lineage.** When porting, cite the equivalent: `// Concept ported from DocuSeal Submitter (db/schema.rb:submitters) — re-implemented from spec.`
3. **No copy-paste.** Even of small snippets. Re-derive.
4. **Independent test fixtures.** Don't pull DocuSeal's PDFs.
5. **Architect role** approves any new "port" before it lands.

## Module-by-module mapping

```
DocuSeal (Rails)                        →  YourSign (TS)
---------------------------------------    -------------------------------------
app/models/submission.rb                →  packages/core-domain/src/submission.ts
app/models/submitter.rb                 →  packages/core-domain/src/submitter.ts
app/models/template.rb                  →  packages/core-domain/src/template.ts
app/models/submission_event.rb          →  packages/core-domain/src/audit-event.ts
app/lib/submissions/create_from_*.rb    →  packages/core-domain/src/factories/*.ts
app/services/templates/process_*.rb     →  packages/pdf-engine/src/process/*.ts
app/services/pdf_signature_*.rb         →  REPLACED — we anchor on Solana, not embed PKCS#7
app/services/submitters/submit_*.rb     →  apps/api/src/routes/submitters.ts
config/routes.rb                        →  apps/api/src/routes/*  (Fastify)
db/schema.rb                            →  packages/core-domain/src/schema.ts (Drizzle)
app/javascript/template_builder/*       →  apps/web/src/components/editor/* (port from prototype)
```

## Things to lift verbatim (allowed)

These are not copyrightable expressions — facts, schemas, and short interfaces:

- The **list of field types** (signature, initial, date, name, email, phone, text, number, checkbox, radio, select, file, image, payment, signature_date).
- The **Submitter status enum** (`awaiting`, `sent`, `opened`, `completed`, `declined`).
- The **routing concept**: `/s/:slug` short links, `/d/:id` document workspace.
- The **timeline event shapes** (timestamps, actor pubkey/email, action verb).

## Onboarding doc for reviewers

When opening a PR that ports DocuSeal logic:

```markdown
### Concept lineage
Ported from: DocuSeal `app/models/submitter.rb` (state machine).
Re-implementation: clean-room from `db/schema.rb` schema + public docs.
Diff from original: state machine adds `attested` step (Solana confirmation gate).
License: Apache-2.0 (re-implemented).
```

The verifier MUST check the lineage block exists and that no DocuSeal source files were read during implementation (enforced by a git pre-commit hook that scans for DocuSeal paths in editor history when present).
