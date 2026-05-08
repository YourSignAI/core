# Verifiers

Verifiers are agents (or static checks) that gate merges. They run with `read-only` sandbox and produce a PASS/REJECT report.

## Always-on

- [`spec-citation.md`](./spec-citation.md) — every commit/PR must cite a spec/ADR/contract reference.
- [`no-secret-leak.md`](./no-secret-leak.md) — static scan for key/secret patterns.

## Conditional

- [`docuseal-cleanroom.md`](./docuseal-cleanroom.md) — if a PR touches DocuSeal-ported code, verify clean-room compliance.

## Adding a new verifier

1. Write the prompt in this folder.
2. Add it to `harness/config.yaml` under `verifiers.always` or `verifiers.conditional`.
3. The orchestrator picks it up on the next run.

## What a verifier returns

```
status: PASS | REJECT
reason: <one-line>
findings:
  - file: path/to/file
    line: 42
    severity: high | medium | low
    note: ...
suggested_fix: <one paragraph>
```

REJECT routes back to the executor with the report appended.
