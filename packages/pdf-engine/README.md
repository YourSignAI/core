# `@yoursign/pdf-engine`

PDF parsing, canonicalization, field detection, and embedding.

## Public API (target)

```ts
export function canonicalize(input: Uint8Array): Uint8Array
export function sha256(input: Uint8Array): Promise<string>
export function detectFields(input: Uint8Array): Promise<DetectedField[]>
export function embedSignatures(
  input: Uint8Array,
  visualSigs: VisualSignature[],
  appendix: AuditAppendix,
): Promise<Uint8Array>
```

## Determinism guarantees

- `canonicalize` strips: `/ID`, `/CreationDate`, `/ModDate`, `/Producer`, `/Creator`, `/Title` if auto-generated. Recompresses streams with deterministic flate (level 6, no `gzip` headers).
- Same input ⇒ same output bytes ⇒ same SHA-256.

## Spec refs

AC-1.*, AC-4.3.2 (audit appendix).

## Test corpus

`test/fixtures/` — 50 PDFs from public sources (gov forms, contract templates) committed alongside expected canonical hashes.

## Status

Stub. Phase 1 deliverable.
