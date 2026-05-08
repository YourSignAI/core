# ADR-0005 — PDF processing: pdf-lib + pdfjs-dist + custom canonicalization

- Status: **Accepted** (2026-05-08)
- Deciders: founding team
- Tags: pdf, foundation

## Context

We need to: parse PDFs, detect signature/initial/date fields, embed visible signatures + an audit appendix at completion, and produce a deterministic canonical hash.

Options:

1. **pdf-lib (TS) + pdfjs-dist (Mozilla) + custom code.** All JS. Browser + Node compatible.
2. **HexaPDF (Ruby — DocuSeal's choice).** No JS port; would split runtime.
3. **Apryse / PDFTron (commercial).** Best feature set, expensive, license-incompatible with Apache-2.0 release.
4. **Ghostscript / qpdf (binaries).** Powerful but heavy and not browser-native.
5. **`unpdf` (small, modern).** Lightweight; best for parsing only.

## Decision

- **Parsing & rendering: `pdfjs-dist`** (Mozilla). Battle-tested in Firefox.
- **Editing & signing: `pdf-lib`** (TypeScript, MIT). Field embedding, page manipulation, audit appendix generation.
- **Canonicalization: custom in `packages/pdf-engine/src/canon/`.** Strip random `/ID`, `/CreationDate`, `/ModDate`, `/Producer`, normalize cross-reference table, recompress streams with deterministic flate.
- **Field detection: custom heuristics** (DocuSeal-inspired) on top of `pdfjs-dist` text extraction. Extensible to ML-based detection post-MVP.

## Why

- **Browser + Node parity.** Hash MUST match between web client and worker; same library across both ensures it.
- **Apache-2.0 compatible.** Both libs are MIT.
- **Deterministic.** We control the canonicalization and can make it byte-stable (AC-1.2.1).
- **Mature.** Both have multi-year track records.

## Why NOT the alternatives

- **HexaPDF.** Ruby; splits stack. We'd need a Ruby microservice just for PDFs — no thanks.
- **Apryse.** Commercial license; conflicts with Apache-2.0 release commitment.
- **Ghostscript.** Big binary; cumbersome on Vercel; not browser-friendly.
- **`unpdf` only.** Insufficient for editing.

## Consequences

- We own the canonicalization algorithm. Bugs there = wrong hashes = compatibility nightmare. Mitigation: property-based tests + a 50-PDF golden corpus committed early.
- We accept that very exotic PDFs (encrypted, AcroForm with JavaScript, malformed XRef) may fail gracefully with `PDF_UNSUPPORTED_FEATURE`. We log + reject; we do NOT silently mangle.
- Field detection is deterministic but heuristic. Manual override is a first-class flow.

## Reversal cost

Low for libraries (swap-out is contained in `packages/pdf-engine`). High for canonicalization once we have signed documents in the wild — that algorithm is **frozen at v1** post-launch.
