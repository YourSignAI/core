---
name: ADR request
about: Surface a cross-cutting decision that needs an ADR before implementation
title: "[adr] <short decision question>"
labels: ["adr", "needs-architect"]
---

## Question

<!-- One sentence. What decision needs to be made? -->

## Why now

<!-- What's blocked until this is decided? -->

## Context

<!-- Constraints, related ADRs, related spec sections -->

## Alternatives under consideration

1. **Option A** — ...
2. **Option B** — ...
3. **Option C** — ...

## Stakes

<!-- Reversal cost: low / medium / high. What changes downstream if we pick wrong? -->

## Asks

- [ ] Architect role drafts ADR-NNNN under `docs/adr/`
- [ ] Security Analyst review (if touches `packages/crypto`, `programs/yoursign`, `apps/api/src/auth/**`)
- [ ] Open follow-up sprint task once ADR is accepted
