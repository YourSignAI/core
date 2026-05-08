# Verifier — DocuSeal lineage block

## What it checks

Any PR touching `packages/core-domain/src/{submitter,submission,template,audit-event,workflow,state}.ts` MUST include a lineage block in the PR description:

```markdown
### Concept lineage
Ported from: DocuSeal <file or model name>.
Re-implementation: clean-room from <db/schema.rb section | public docs URL>.
Diff from original: <brief>.
License: Apache-2.0 (re-implemented).
```

## Why

We re-implement DocuSeal concepts (AGPL-3.0) into our Apache-2.0 codebase. To stay legally clean we MUST document that re-implementation was clean-room.

## Verdict

- **Pass:** lineage block present and complete (all four sub-fields filled).
- **Fail:** missing or incomplete. PR blocked.

## When this verifier doesn't run

Files outside `packages/core-domain/src/{the listed files}`.
