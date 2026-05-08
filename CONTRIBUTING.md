# Contributing to YourSign

> Public-from-day-1 means contributions land in public. Read this once before opening a PR.

## Prerequisites

- Node 24 LTS (`nvm use`)
- pnpm 9.x (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Solana CLI 2.x + Anchor (latest stable)
- Rust 1.79+

## Setup

```bash
git clone https://github.com/YourSignAI/core.git
cd core
pnpm install
pnpm dev          # starts apps/web, apps/api, apps/worker, apps/verifier
```

## The flow

1. **Find or write a spec.** All work cites a section in `docs/01-spec.md`, an ADR, or a contract.
2. **Branch.** `feat/<scope>-<short>`, `fix/<scope>-<short>`, `chore/...`.
3. **Code.** Stay in scope. One AC per PR when possible.
4. **Test.** `pnpm typecheck && pnpm test && pnpm lint`.
5. **Open a PR.** The title MUST cite the spec/ADR/contract.
6. **Wait for the verifier.** Verifier runs in CI. Failures block merge.
7. **Wait for human review.** A maintainer signs off after the verifier passes.

## PR template

```markdown
## What
<one paragraph>

## Why (spec ref)
Implements: AC-X.Y.Z (or ADR-NNNN, or contract:api#endpoint)

## How
<short list of files and what changed>

## Verifier hints
- spec citation: AC-X.Y.Z is in commit messages and tests
- contract conformance: schemas in packages/schemas updated
- lineage (if applicable): see core-domain/src/X.ts header

## Risks / rollback
<any non-trivial risk; how to revert>
```

## Communication

- Issues for bugs and feature requests.
- Discussions for design questions before opening a PR.
- For security: see `SECURITY.md`. Do **not** open a public issue.

## Tooling we use to build YourSign itself

We dogfood the Symphony Harness. See `harness/README.md` and `docs/03-symphony-harness.md`. Even if you contribute by hand, please cite specs in commits — the human verifiers (us) do the same checks.

## Code of conduct

See `CODE_OF_CONDUCT.md`. Be kind, be technical, be honest about what you don't know.
