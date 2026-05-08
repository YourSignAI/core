---
name: Sprint Task
about: Track an item planned for the active sprint
title: "[s<N>-<day>] <short description>"
labels: ["sprint", "todo"]
assignees: ''
---

## Sprint Day

<!-- Reference: docs/05-sprints/SPRINT-N.md#<day-section> -->

## Description

<!-- What needs to be done? Stay focused on a single AC. -->

## Spec / ADR / Contract refs

<!-- At least one reference is REQUIRED. Examples:
- AC-1.2.1 (docs/01-spec.md §1)
- ADR-0004 (encryption strategy)
- contract:api#sign-doc -->

## Acceptance Criteria

- [ ] <falsifiable outcome 1>
- [ ] <falsifiable outcome 2>

## Builder Block (six inputs — required when introducing a new capability)

| Input | Value |
|---|---|
| **Goal** (verifiable outcome with terminal event) | |
| **Hierarchy** (call order + ownership) | |
| **Specs** (versioned spec/ADR/contract refs) | |
| **Workflow** (numbered steps, gates, terminal states) | |
| **Tools** (internal + external APIs invoked) | |
| **Context** (workspace, document, signer, policy) | |

## Events / Tools affected

<!-- Audit events emitted, on-chain ix touched, REST endpoints changed -->

## Verifier hints

<!-- How will the Verifier role know this is done? -->

## Notes
