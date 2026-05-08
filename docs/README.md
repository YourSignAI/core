# YourSign — documentation

This is a **spec-driven** repo. Every feature flows through these documents in order:

```
00-vision.md             → why we exist
01-spec.md               → what the system must do (falsifiable)
02-architecture.md       → how it's structured (component view)
03-symphony-harness.md   → how we build it (agent orchestration)
04-roadmap.md            → in what order
05-hackathon-strategy.md → how we win Colosseum
06-docuseal-reuse.md     → what we keep from DocuSeal

05-sprints/              → Google Design Sprint plans (SPRINT-0..4) — fed into Ralph
adr/                     → reversible architecture decisions, numbered
contracts/               → API, on-chain program, event schemas (consumed by tests)
prds/                    → product requirements, per milestone
tasks/                   → executable task breakdowns
sequences/               → mermaid sequence diagrams per critical flow
```

## How to read this in order

1. New contributor? Start at `00-vision.md` and read top-to-bottom.
2. Implementing a feature? Read its PRD → spec section → contracts → ADRs it references.
3. Reviewing a PR? Find the spec section it claims to implement and check whether the diff is consistent.

## How to add a new feature

1. Write or update `prds/<milestone>.md`.
2. Update the relevant section of `01-spec.md` with new acceptance criteria.
3. If the feature changes a contract, update `contracts/`.
4. If the change is architectural, write an ADR in `adr/`.
5. Generate a task breakdown in `tasks/`.
6. Only then, code.

The harness (`harness/orchestrator.md`) automates steps 1–5 when fed a one-line feature description.
