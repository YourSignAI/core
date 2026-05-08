# Verifier — Spec citation

## What it checks

Every PR (and its commits) MUST cite a spec section, ADR, or contract section.

Acceptable patterns (regex):

- `AC-\d+\.\d+(\.\d+)?` — e.g., `AC-4.2.1`
- `ADR-\d{4}` — e.g., `ADR-0003`
- `contract:(api|on-chain-program|events)#[\w-]+`

## Where it runs

- Locally: a husky pre-commit hook scans the staged commit message.
- CI: a GitHub Action scans the PR title + each commit message.

## Verdict

- **Pass:** at least one citation present.
- **Fail:** no citation. PR is blocked.

## Override

Emergency-only: a human reviewer may add `Verifier-Override: <reason>` to the PR description. Logged in `harness/runs/`.
