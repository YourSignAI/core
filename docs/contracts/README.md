# Contracts

Three machine-checkable contracts that the rest of the repo depends on:

- [`api.md`](./api.md) — REST + WebSocket between `apps/web`/`apps/verifier` and `apps/api`.
- [`on-chain-program.md`](./on-chain-program.md) — Anchor program accounts, instructions, errors.
- [`events.md`](./events.md) — audit event envelope and per-type payload schemas.

## Why contracts?

A contract change is a breaking change. Putting them in markdown — alongside the code that depends on them — makes them reviewable. Tests in each workspace assert that the running implementation matches the contract.

## Generation chain

```
contracts/api.md         → packages/schemas (Zod)  → apps/web, apps/api use the same types
contracts/on-chain-...md → programs/yoursign IDL  → packages/solana-sdk regenerates clients
contracts/events.md      → packages/schemas/events → apps/api emits, apps/web subscribes
```

## How to change a contract

1. Open a PR that updates the contract markdown.
2. Show the impact: list the affected workspaces.
3. Bump the relevant version (`yoursign.canon.v1` → `v2`, or REST `/v1` → `/v2`).
4. Verifier role MUST review.
