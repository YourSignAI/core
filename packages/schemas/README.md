# `@yoursign/schemas`

Zod schemas + shared TypeScript types. Generated/maintained from `docs/contracts/`.

## What lives here

- `api/*.ts` — request/response schemas matching `docs/contracts/api.md`
- `events/*.ts` — audit event schemas matching `docs/contracts/events.md`
- `chain/*.ts` — TypeScript mirror of on-chain account layouts (regenerated from Anchor IDL)

## Why centralize

- One source of truth for client + server validation.
- Compile-time errors when contracts change.
- Public schemas = public artifact for hackathon judges + integration partners.

## Status

Stub. Phase 0 — interface exports only.
