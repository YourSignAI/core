# `@YourSignAI/core-domain`

Pure-TypeScript domain layer. **No I/O, no framework deps.**

## Contents

- `Submitter` — a recipient who will sign or has signed
- `Submission` — a document instance with one or more Submitters
- `Template` — a reusable Submission shape (for power users; not in MVP)
- `AuditEvent` — append-only state-change record
- State machine: `draft → sent → opened → partial → completed | declined`

Concepts ported from DocuSeal (clean-room). See [`docs/06-docuseal-reuse.md`](../../docs/06-docuseal-reuse.md).

## Spec refs

Backs AC-1.* (canon record), AC-2.* (identity), AC-7.* (audit).

## Status

Empty. Phase 0.
