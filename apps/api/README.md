# `apps/api`

Fastify API + WebSocket gateway. Auth, document orchestration, payment requests, audit log.

- Runtime: Node 24 LTS
- HTTP: Fastify 5
- DB: Postgres (Neon) via Drizzle ORM
- Queue: BullMQ on Redis (Upstash)
- Auth: SIWS-issued JWT; Privy session JWT accepted as delegate

## Routes

See [`docs/contracts/api.md`](../../docs/contracts/api.md) — that's the canonical surface.

## What it depends on (workspace)

- `@YourSignAI/core-domain` — Submitter, Submission, Template, AuditEvent
- `@yoursign/schemas` — request/response Zod schemas
- `@yoursign/solana-sdk` — server-side program client (no signing — used to build Solana Pay tx requests and read state)

## Notable non-goals

- Does NOT decrypt documents. Ever.
- Does NOT hold private keys.
- Does NOT call Light Protocol directly — that's the worker's job.

## Spec refs

Implements server-side AC-1.*, AC-2.*, AC-6.*, AC-7.*.

## Status

Stub. `/healthz` returns `{ ok: true }` and that's all. Phase 0.
