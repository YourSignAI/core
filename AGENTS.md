# AGENTS.md — Symphony Harness charter

This file is the **AI agent charter** for the YourSign monorepo. Any agent (Claude, Codex, Gemini, custom) working in this repo MUST read this file first.

## Mission

Build YourSign — a decentralized document signing platform — in a way that:

1. **Specs lead, code follows.** No PR without a referenced spec section, ADR, or contract.
2. **Verification is a first-class citizen.** Every change is verified by a separate agent before merge.
3. **The repo is a public artifact.** Code, docs, and decisions are readable by hackathon judges, recruiters, and contributors. Optimize for *narrative legibility*, not just correctness.

## Roles

| Role | Responsibility | Spawned by |
| ---- | -------------- | ---------- |
| **Orchestrator** | Picks the next task, spawns the right specialist, aggregates results. | Human or `harness/orchestrator.md` skill |
| **Researcher** | Pulls library docs, on-chain patterns, regulatory context. Read-only. | Orchestrator |
| **Planner** | Decomposes a PRD into tasks with acceptance criteria. | Orchestrator |
| **Executor** | Implements code against a single task. Stays in scope. | Orchestrator (after Planner) |
| **Verifier** | Reviews the diff against the spec + contracts. Can REJECT. | Orchestrator (after Executor) |
| **Architect** | Owns ADRs. Consulted on cross-cutting decisions. | Human or escalation from any role |

## Hard rules

1. **No code without a spec reference.** Every PR title or commit must cite `spec:1.4` or `ADR-0003` or `contract:api#sign-doc`.
2. **No new dependency without an ADR or a one-liner in `docs/adr/dependencies.md`.**
3. **No on-chain change without a verifier pass against `docs/contracts/on-chain-program.md`.**
4. **No prompt or model name hardcoded.** All harness prompts live in `harness/prompts/`.
5. **No silent scope creep.** Executors who hit ambiguity STOP and re-summon the Orchestrator.

## Determinism budget

The harness aims to be reproducible. Each agent invocation logs:

- The spec/contract/ADR refs it consumed.
- The prompt template + version.
- The model + parameters.
- A diff summary.

Logs land in `harness/runs/` (gitignored, but a redacted summary may be committed for audit milestones).

## When to escalate to a human

- A spec ambiguity that cannot be resolved by reading existing docs.
- A required ADR that doesn't exist yet.
- A failed verification loop that has retried 3 times.
- Anything touching cryptographic primitives, key custody, or user funds.

## How to use this with Claude Code

```bash
# bootstrap a feature
claude
> /gsd-spec-phase signing-flow
> /gsd-plan-phase signing-flow
> /gsd-execute-phase signing-flow

# verify
> ask the verifier to review the last commit against docs/contracts/api.md#sign-doc
```

See `harness/orchestrator.md` for the full playbook.
