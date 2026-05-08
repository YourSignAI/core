# Verifier — Contract conformance

## What it checks

That `apps/api`'s registered routes match `docs/contracts/api.md` exactly.

Procedure:

1. Boot `apps/api` in test mode.
2. Read its route registry.
3. Parse `docs/contracts/api.md` for `^### \`(GET|POST|PATCH|DELETE) (.*)\`$` headers.
4. Diff the two sets.

## Verdict

- **Pass:** sets are equal AND request/response Zod schemas match the JSON examples in the contract.
- **Fail:** any route in the API not in the contract, or vice versa, or schema mismatch.

## When the contract changes

The contract is the source of truth. The fix is **always**: update the API to match. If the API needs a new route, the contract must be updated first (in the same PR or earlier).

## Tooling

- `packages/schemas` exports a runtime `apiContract` map of `${method} ${path}` → `{ requestSchema, responseSchema }`.
- The verifier validates real responses sampled from a smoke test against `responseSchema`.
