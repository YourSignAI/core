# `harness/`

The Symphony Harness — agent orchestration layer for YourSign. Read `docs/03-symphony-harness.md` first.

## What's in here

```
harness/
├── README.md            # this file
├── orchestrator.md      # the playbook for the orchestrator role
├── config.yaml          # model + tool selection per role
├── prompts/             # versioned role prompts
│   ├── researcher.md
│   ├── planner.md
│   ├── executor.md
│   └── architect.md
├── verifiers/           # versioned verifier checks
│   ├── spec-citation.md
│   ├── no-secret-leak.md
│   ├── adr-presence.md
│   ├── lineage-block.md
│   └── contract-conformance.md
├── evals/               # golden-set evaluations
└── runs/                # gitignored runtime logs
```

## Quickstart

```bash
# Implement a feature end-to-end with verification
claude
> /gsd-spec-phase signing-flow
> /gsd-plan-phase signing-flow
> /gsd-execute-phase signing-flow
> /gsd-code-review

# Or use the Blueprint flow (TDD-E2E)
> /bp:generate-prp signing-flow
> /bp:execute-prp signing-flow

# Delegate a security review
> ask the Security Analyst (Gemini Pro) to review packages/crypto against ADR-0004
```

## Why this layer exists

A repo without a harness drifts as more agents touch it. This layer makes drift visible: every agent invocation logs the spec it claimed to implement, and verifiers reject diffs that lie about it.

## Status

Phase 0 — files below are scaffolds. Real prompts ship as part of T0.7.
