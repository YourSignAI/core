# `apps/verifier`

Public, read-only verification site. Independent deploy at `verify.yoursign.tech`.

- Framework: Next.js 16 (mostly static)
- Talks to: public Solana RPC + Light Protocol RPC. **No YourSign backend.**
- Implements: AC-5.* and the verification flow at `docs/sequences/verification-flow.md`.

## Why a separate app

- Survives our backend going down. Critical for trust.
- Different domain (`verify.yoursign.tech`) reinforces the "we don't gatekeep verification" message.
- Smaller bundle, faster LCP, no auth.

## What it depends on (workspace)

- `@yoursign/solana-sdk` (read-only client)
- `@yoursign/crypto` (verify ed25519 signatures + recompute canonical hash)
- `@yoursign/pdf-engine` (canonicalize uploaded PDF in browser)
- `@yoursign/schemas`

## Status

Stub. Phase 0.
