<!-- Title format: feat(scope): summary (spec:AC-X.Y.Z) -->

## What

<!-- One paragraph -->

## Why (spec / ADR / contract reference)

<!-- REQUIRED — verifier blocks PRs without one of these:
- AC-X.Y.Z (cite docs/01-spec.md)
- ADR-NNNN
- contracts/api#endpoint OR contracts/on-chain-program#ix OR contracts/events#type -->

Closes #<issue-id>

## How

- file:line — what changed and why

## Verifier checklist

- [ ] Spec citation present in PR title or commit message
- [ ] No secrets leaked (rg-based scan ran clean)
- [ ] Contract conformance — `packages/schemas` matches `docs/contracts/api.md`
- [ ] Lineage block present (if touched `packages/core-domain`)
- [ ] ADR linked (if touched `packages/crypto`, `programs/yoursign`, `apps/api/src/auth/**`, deps)
- [ ] Tests added or updated
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green

## Concept lineage (REQUIRED if porting from DocuSeal)

```
Ported from: <DocuSeal file/model>
Re-implementation: clean-room from <db/schema.rb section | public docs URL>
Diff from original: <brief>
License: Apache-2.0 (re-implemented)
```

## Builder block (six inputs — REQUIRED for new capabilities)

| Input | Value |
|---|---|
| Goal | |
| Hierarchy | |
| Specs | |
| Workflow | |
| Tools | |
| Context | |

## Risks / rollback

<!-- Any non-trivial risk; how to revert -->

## Screenshots (UI changes)

<!-- Before / After when touching apps/web or apps/verifier -->
