# `apps/worker`

Long-running Node process consuming BullMQ jobs.

## Job types

- `anchor-document` — call `register_document` on the Anchor program (compressed write).
- `anchor-completion` — call `complete_document` once all signers attested.
- `verify-payment` — poll Solana RPC for confirmed USDC transfers.
- `notary-webhook` — relay notarization status to partner notary.
- `audit-export` — build the audit bundle zip.

## Why a worker (not Vercel Functions)

- PDF processing on edge functions has cold start + size limits.
- Solana RPC polling needs sustained connections.
- BullMQ idle costs are ~0; this is the cheapest "small server" we can run.

## What it depends on (workspace)

- `@YourSignAI/core-domain`
- `@yoursign/pdf-engine`
- `@yoursign/solana-sdk` (with signing keypair for the program-owned operations)
- `@yoursign/schemas`

## Deployment

Single container on Fly.io or Railway. One process, autoscale to N=1. (No microservices in MVP.)

## Status

Stub. Phase 0.
