# PRD — MVP (hackathon submission)

- Owner: founding team
- Target ship: end of Colosseum hackathon window (4 weeks from 2026-05-08)
- Status: in progress

## Problem

Freelancers, SMBs, and Web3 teams in LATAM need legally valid e-signatures but face:

- **Cost.** DocuSign starts at $40/user/mo; envelopes are throttled.
- **Trust.** Centralized vendors hold the document and the audit log; users cannot verify integrity independently.
- **Crypto-native gap.** Existing Web3 "signing" UX is hostile (raw transactions, gas fees, no document workflow).

## Solution (one paragraph)

A web app where you drop a PDF, optionally invite signers, and produce a cryptographically signed document anchored on Solana via ZK-compressed attestations. Free for typical workflows; premium features (notarization, multi-party escrow, large teams) settle in USDC via Solana Pay. Every signature is verifiable by anyone using only public Solana RPC.

## Users & jobs to be done

| User | Job |
| ---- | --- |
| Freelance designer | "Send a service contract and get it signed today, without a SaaS subscription." |
| BR SMB ops lead | "Replace DocuSign — cheaper and crypto-native — without losing legal weight." |
| Web3 startup | "Sign a multi-party deal with on-chain proof we can show investors." |
| Notary partner | "Provide ICP-Brasil counter-signature service over a programmable rail." |
| External auditor | "Verify a signature didn't tamper with the document, without trusting any vendor." |

## Scope (in)

The features mapped to spec sections in `docs/01-spec.md`:

- §1 Document upload + canonicalization
- §2 Wallet/email auth (Phantom/Backpack/Solflare/Privy)
- §3 Client-side encryption (default mode, no threshold)
- §4 Sign + on-chain attestation via ZK Compression
- §5 Public verifier site + CLI
- §6 USDC payments via Solana Pay (one premium feature wired: notarization stub)
- §7 Audit log + bundle export

## Scope (out / deferred)

See `01-spec.md §9` and `04-roadmap.md` Stretch.

## Success criteria

- 100% of acceptance criteria in §1–§7 passing on Vercel preview.
- ≥10,000 verifiable signatures generated during demo period (load test counts).
- ≤$50 total Solana spend during demo period (cost guardrail per `00-vision.md` north star).
- Lighthouse Performance ≥90 on both `apps/web` and `apps/verifier`.
- Demo video and one-page brief submitted to Colosseum portal.

## Risks (top 5)

1. **Light Protocol RPC instability.** → Fallback to uncompressed accounts behind a feature flag.
2. **Privy MPC rough edges.** → Wallet Adapter ships first as the baseline.
3. **PDF canonicalization edge cases.** → Golden corpus + property tests in Phase 1.
4. **USDC compliance in BR.** → Receive USDC strictly as service fee, no FX rails.
5. **Hackathon scope creep.** → Specs are the law. Architect role gates new ADRs.

## Dependencies & integrations

- Vercel (hosting `apps/web`, `apps/verifier`)
- Neon (Postgres), Upstash (Redis)
- Arweave / Irys (ciphertext)
- Privy (embedded MPC)
- Light Protocol (compression)
- USDC SPL on Solana mainnet (`EPjFWdd5...`)
- ICP-Brasil notary partner (one — to be sourced)

## Open product questions (for discuss-phase)

- [ ] What's the per-document free quota for multi-party (currently spec'd at 5/month)?
- [ ] Should the ICP-Brasil notarization stub return a fake counter-sig that's clearly labeled as `demo-only`, or block real notarization until a partner signs on?
- [ ] Free tier: cap by document count or by signer count?
