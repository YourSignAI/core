# YourSign — `core`

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Built on Solana](https://img.shields.io/badge/Built%20on-Solana-9945ff)](https://solana.com)
[![Colosseum hackathon](https://img.shields.io/badge/Colosseum-hackathon-14f195)](https://arena.colosseum.org/hackathon)
[![Spec-driven](https://img.shields.io/badge/SDD-spec--driven-555)](docs/01-spec.md)

> Decentralized document signing on Solana. PDFs encrypted client-side, signatures verified on-chain via ZK-compressed attestations, premium tiers paid in USDC. Built in the open for the [Colosseum hackathon](https://arena.colosseum.org/hackathon) by [@YourSignAI](https://github.com/YourSignAI).

`core` is the public monorepo. It contains **everything that ships**: web app, API, worker, public verifier, on-chain program, shared packages, and the **Symphony Harness** that orchestrates AI agents to build the rest.

**Org**: [github.com/YourSignAI](https://github.com/YourSignAI) · **Repo**: `YourSignAI/core` · **License**: Apache-2.0 · **Status**: Phase 0 — bootstrap.

## Why this exists

Existing e-signature platforms (DocuSign, DocuSeal, Adobe Sign) are centralized. They:

- Hold your document content on their servers (and your signatures with it).
- Charge per-envelope fees once you scale past a free tier.
- Tie legal validity to opaque, vendor-controlled audit trails.
- Cannot prove a signature was *not* tampered with after the fact without trusting the vendor.

YourSign flips it:

- **PDF content is encrypted client-side**, only signatories can decrypt.
- **Signatures are cryptographic** — Ed25519 over a SHA-256 of the canonical document.
- **Audit trail is on-chain** — ZK-compressed attestations on Solana, anchored to mainnet.
- **Free for the user, sustainable for the platform** — base signing is gasless (off-chain message + compressed account); premium features (notarization, multi-party escrow, large-team workflows, ICP-Brasil bridge) settle in USDC via Solana Pay.
- **Legally valid** under MP 2.200-2 (Brazil) and eIDAS (EU advanced electronic signature) by binding the on-chain attestation to identity proofs.

## Stack at a glance

| Layer            | Choice                                                           |
| ---------------- | ---------------------------------------------------------------- |
| Frontend         | Next.js 16 App Router · shadcn/ui · TanStack Query · `pdf-lib`   |
| Backend          | Fastify (Node 24) · Postgres (Neon) · BullMQ                     |
| Worker           | Long-running Node process · canonicalization, OCR, anchoring     |
| Wallets          | Phantom · Backpack · Solflare · Privy MPC (email/social)         |
| On-chain         | Anchor program · Light Protocol ZK Compression · Solana Pay USDC |
| L2 / scaling     | Light Protocol compressed accounts; MagicBlock ER for live co-sign sessions |
| Storage          | Arweave/Irys for ciphertext blobs · S3 for hot cache             |
| Encryption       | X25519 envelope keys · per-recipient AES-256-GCM payload key     |
| Identity         | Solana pubkey + DIDs · optional ICP-Brasil bridge                |

## Repo layout

```
core/
├── apps/
│   ├── web/         # Next.js — landing, editor, dashboard, sign flow
│   ├── api/         # Fastify — REST/WS, auth, orchestration
│   ├── worker/      # Background jobs — PDF canon, OCR, anchoring
│   └── verifier/    # Public verification site (read-only)
├── packages/
│   ├── core-domain/ # Submitter, Submission, Template, AuditEvent (TS port of DocuSeal)
│   ├── pdf-engine/  # PDF parsing, field detection, embedding, canonicalization
│   ├── solana-sdk/  # Typed Anchor client + helpers
│   ├── crypto/      # Hash, envelope encryption, threshold helpers
│   ├── ui/          # shadcn-based component library (extracted from prototype)
│   ├── schemas/     # Zod schemas + shared DTOs
│   └── config/      # Shared eslint, ts, prettier
├── programs/
│   └── yoursign/   # Anchor program: attestations, USDC escrow, registry
├── docs/            # Spec-driven development docs (see docs/README.md)
└── harness/         # Symphony Harness — agent orchestration scaffolding
```

## Spec-Driven Development

This repo is built **spec-first**. No code lands without a falsifiable spec.

- `docs/01-spec.md` — system spec (WHAT) with falsifiable acceptance criteria.
- `docs/02-architecture.md` — component breakdown (HOW) with C4-style diagrams.
- `docs/adr/` — architecture decision records for every reversible choice.
- `docs/contracts/` — API, on-chain program, and event contracts (consumed by tests).
- `docs/prds/` — product requirement documents per milestone.
- `docs/tasks/` — task breakdowns ready for an executor (human or agent).

Read `docs/README.md` for the full map.

## Symphony Harness

We build YourSign the same way OpenAI builds research code: an **orchestrator agent** drives a fleet of specialist agents (researcher, planner, executor, verifier) against a shared spec. Every change passes through a verification loop before it lands. See `harness/README.md`.

## Status

Phase 0 — bootstrap. Spec and scaffolding only. No runtime code yet. Track milestones in `docs/04-roadmap.md`.

## License

Apache-2.0. Public from day 1 — that's a Colosseum requirement and a feature, not a tax.
