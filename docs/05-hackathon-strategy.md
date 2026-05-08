# 05 — Colosseum hackathon strategy

> What does it take to win? This doc reverse-engineers Colosseum's [evaluation rubric](https://arena.colosseum.org/hackathon) and aligns our work to it.

## The judging axes (typical Colosseum rubric)

1. **Functionality / completion** — does the demo actually work end-to-end?
2. **Innovation / originality** — is this *new*, or a clone with a re-skin?
3. **Technical quality** — code, security, architecture.
4. **User experience** — pixel polish, copy, performance.
5. **Business potential / market fit** — could this real-world ship?
6. **Solana integration depth** — is Solana load-bearing or decorative?
7. **Open-source quality** — public repo, README, contribution path.

Each axis maps to a deliverable. We're transparent about it.

| Axis | Deliverable | Where it lives |
| ---- | ----------- | -------------- |
| Functionality | E2E sign-to-verify on Vercel preview | `apps/web` + `apps/verifier` |
| Innovation | ZK-compressed attestations + USDC premium tier | `programs/yoursign` + ADR-0002, ADR-0003 |
| Technical | Spec-driven monorepo + Symphony Harness | This `docs/` + `harness/` |
| UX | Port the Airbnb-quality prototype 1:1 | `apps/web` + `packages/ui` |
| Business | Free for freelancers, USDC for enterprises | `00-vision.md` + `06-docuseal-reuse.md` |
| Solana | Solana is the trust root, USDC is the rail | ADR-0002, ADR-0003 |
| OSS quality | Apache-2.0, public from day 1, AGENTS.md | repo root |

## What we submit

1. **Live URL** — `yoursign.tech` (web) + `verify.yoursign.tech` (verifier).
2. **Public repo** — this monorepo at `github.com/YourSignAI/core`.
3. **Demo video** (2 min) — see "Demo script" below.
4. **One-page brief** — `docs/milestones/hackathon-submission.md`.
5. **On-chain proof** — a real document with multiple attestations on devnet/mainnet.

## Demo script (2 min)

**00:00–0:15 — Hook.** "DocuSign trusts a database. We trust math."

**0:15–0:45 — Free path.** Drop a PDF, auto-detect fields, send to a recipient. Recipient signs with Phantom. Attestation appears on Solana Explorer in real time. Cost shown: $0.0008.

**0:45–1:15 — Premium path.** A user clicks "notarize for legal weight." Solana Pay USDC modal. Pay $1. Counter-signature attestation appears. Audit appendix links open Solana Explorer.

**1:15–1:45 — Verifier.** Open `verify.yoursign.tech`, drop the same PDF, see green checkmarks for each signature. Open the same flow without our app — using only `solana-sdk verify` from a terminal — same result.

**1:45–2:00 — Closer.** "Free for the user, sustainable for us, verifiable forever. YourSign. Built in public. Built on Solana."

## What we DO NOT do (to avoid the "kitchen sink" failure mode)

- ❌ A token. USDC only.
- ❌ NFT certificates. (Compressed attestations strictly outperform NFTs for this use case — and judges have seen 50 NFT-cert demos.)
- ❌ A DAO. (Not load-bearing.)
- ❌ Multi-chain. Solana only.
- ❌ AI features for AI's sake. The harness is *how we build*; it's not a product feature.

## What makes us memorable

1. **The cost number.** "$0.0008 per attestation, demonstrated live." Shows we understand Solana economics.
2. **The verifier without us.** Most demos can't be verified after the demo ends. Ours can.
3. **The Brazilian wedge.** ICP-Brasil bridge + USDC settlement = a real GTM story for LATAM, not "global SaaS day 1."
4. **The harness.** A public AGENTS.md and a public `harness/` directory shows we can keep building this after the hackathon.
5. **The DocuSeal lineage.** We don't pretend to invent e-sign. We extend an OSS standard. Judges respect that intellectual honesty.

## Schedule overlap with the spec phases

See `04-roadmap.md` Gantt. Demo prep starts in parallel with Phase 4 (week 2.5), not at the end.
