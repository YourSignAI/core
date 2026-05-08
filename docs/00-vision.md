# 00 — Vision

## One sentence

**YourSign** is the first decentralized e-signature platform where document content is encrypted client-side, signatures are cryptographically verifiable on Solana, and premium tiers settle in USDC — built for individuals and Latin-American businesses that want DocuSign-grade ergonomics without DocuSign-grade rent extraction or trust assumptions.

## Why now

1. **Solana is mature enough.** Light Protocol's ZK Compression (mainnet 2024) made it economically viable to write ~1¢ attestations at sub-second finality. Fluid wallet UX (Phantom, Backpack, Privy MPC) removed the cognitive tax of seed phrases.
2. **USDC is the de facto digital dollar.** Solana Pay + USDC give us a global, instant settlement rail that costs less than Stripe and crosses borders without correspondent banks.
3. **DocuSeal proved a wedge exists.** A 30k-star OSS clone of DocuSign in two years means the market is hungry for a self-hosted, programmable alternative. We extend that wedge: fully decentralized, cryptographically anchored, and crypto-native for payments — but with the same DX users already love.
4. **Brazilian regulatory tailwind.** MP 2.200-2 (ICP-Brasil) explicitly recognizes "outras modalidades" of electronic signatures when both parties accept them. eIDAS (EU) recognizes "Advanced Electronic Signatures" with cryptographic identity proofs. We straddle both.
5. **Colosseum hackathon.** A focused, time-bounded forcing function to ship a *winning* MVP, not a perfect one. See `05-hackathon-strategy.md`.

## Who we serve

| Persona | Primary need | What they pay for |
| ------- | ------------ | ----------------- |
| **Solo professional** (designer, lawyer, freelancer) | Sign client contracts without a paid plan | Free; donations; ICP-Brasil bridge add-on |
| **Brazilian SMB** | Replace DocuSign + reduce per-envelope cost | USDC subscription; team workflows |
| **Web3-native team** | Multi-sig agreements, on-chain governance attestations | USDC; ER-based live co-signing |
| **Notary / law firm** | Anchor critical documents with court-grade audit | Per-envelope USDC fee + ICP-Brasil counter-signature |

## What we are NOT

- Not a wallet. We integrate them.
- Not a notary. We integrate ICP-Brasil notaries.
- Not a custodian. Keys never leave the user's device (or their MPC shards).
- Not a token issuer. USDC only. (See ADR-0003.)
- Not a generic blockchain product. **Solana only.** (See ADR-0002.)

## Three-line pitch (for Colosseum demo)

> "DocuSign costs $40/user/month and trusts a database. YourSign is gasless to use, verifiable on Solana, and we charge USDC only when you need notarization-grade proof. Free tier covers 100% of the freelance market; the paid tier wins enterprises that already accept stablecoins."

## North-star metric

**Verifiable signatures per dollar of infra cost.** Maximize numerator (volume), minimize denominator (per-attestation cost via ZK Compression). Target at hackathon end: ≥10,000 verifiable signatures, ≤$50 of total Solana spend.

## Non-negotiables (ordered)

1. **Custodial sovereignty.** Users always retain key custody. No exceptions.
2. **Verifiability without us.** Anyone can verify a signature using only the public document hash + on-chain attestation, without our servers.
3. **Public code.** Apache-2.0, public from commit 1.
4. **Falsifiable specs.** Every spec line is testable. Vague intent goes in `00-vision.md`, not in `01-spec.md`.
5. **Symphony Harness.** Agents build this. Humans review. Specs arbitrate.
