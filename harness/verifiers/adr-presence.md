# Verifier — ADR presence for sensitive changes

## What it checks

A PR that modifies any of these MUST cite an existing ADR or include a new one in the same PR:

- `packages/crypto/**`
- `programs/yoursign/**`
- `apps/api/src/auth/**`
- `apps/api/src/routes/payments/**`
- `vercel.ts`
- `package.json` (dep additions)
- `pnpm-workspace.yaml` (new workspace)

## Verdict

- **Pass:** PR description references at least one `ADR-NNNN` (existing or new).
- **Fail:** none. PR blocked until Architect role produces an ADR.

## Why

These are the highest-leverage areas; reversing a bad decision here is expensive. We force the team to slow down and write the decision.
