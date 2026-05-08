# ADR-0001 — Monorepo with pnpm + Turborepo

- Status: **Accepted** (2026-05-08)
- Deciders: founding team
- Tags: tooling, foundation

## Context

We need to ship a web app, a public verifier site, an API, a worker, an Anchor program, and several shared libraries within four weeks. We also need this repo to be a public, navigable artifact for hackathon judges.

Options considered:

1. **Multi-repo.** One repo per app/package. Maximum decoupling.
2. **Single Next.js app.** Everything in `app/` with route handlers as the API.
3. **pnpm workspace + Turborepo.** Multi-package monorepo with task graph.
4. **Nx.** Heavier; first-class for enterprise.
5. **Bun workspaces.** Faster install, less mature for our stack.

## Decision

**pnpm workspace + Turborepo.**

- Apps in `apps/*`, libraries in `packages/*`, on-chain code in `programs/*`.
- Turborepo for incremental builds and caching across CI runs.
- Single `tsconfig.base.json`; per-package extends.

## Why

- **Visibility.** Judges read one repo; recruiters too.
- **Atomic refactors.** Schema lives in `packages/schemas` and changes propagate via TS.
- **Independent deploys.** Vercel deploys `apps/web` and `apps/verifier` separately. The API ships to its own runtime.
- **Pinned versions.** pnpm's strictness avoids accidental dep drift.

## Why NOT the alternatives

- **Multi-repo.** Splits PRs, splits issues, kills the demo narrative. Hard rule for the hackathon: one repo.
- **Single Next.js.** Mixing on-chain, worker, and frontend in route handlers makes the verifier infeasible (must be deployable independently). Worker can't run as a serverless function (long PDF processing).
- **Nx.** More config than we need for four weeks. Reconsider post-MVP only if we hit pain.
- **Bun workspaces.** Anchor + Solana toolchain is the long pole; install speed isn't the bottleneck.

## Consequences

- We pay a small Turborepo learning cost; the team gets cache-aware CI in return.
- Anyone proposing a new package must add it to `pnpm-workspace.yaml` AND a `turbo.json` task entry if needed.
- We commit to **pnpm only.** No npm or yarn lockfiles permitted.

## Reversal cost

Low. Migration to Nx or to a single app is mechanical. ADR can be replaced; do not silently change tooling.
