# ADR-0002 — Solana mainnet + Light Protocol ZK Compression

- Status: **Accepted** (2026-05-08)
- Deciders: founding team
- Tags: chain, scaling, on-chain

## Context

We need an on-chain anchor for signature attestations. Requirements:

1. ≤$0.001 per attestation at p99.
2. Sub-second perceived finality.
3. Mature wallet UX (Phantom, Backpack, Solflare).
4. USDC native and liquid.
5. **Mandatory** for Colosseum hackathon: Solana.

Within Solana, we need a "scaling" story for high-volume signature events. Options:

1. **Native (uncompressed) accounts.** ~0.002 SOL rent per attestation; expensive at scale.
2. **Light Protocol ZK Compression.** Compressed state on Solana mainnet; ~5,000x cheaper writes. Mature, audited, used by Helius and others.
3. **MagicBlock ephemeral rollups.** Off-mainnet execution, settle-back. Great for live co-signing sessions but adds bridge complexity.
4. **Sonic SVM.** L2-style, gaming-focused. Off-mission.
5. **Eclipse.** SVM on Ethereum settlement. Off-Colosseum.

## Decision

- **Primary chain: Solana mainnet.**
- **Storage scheme: Light Protocol ZK Compression** for `SignatureAttestation` and `DocumentRegistry` accounts.
- **Reserved for live multi-party signing: MagicBlock ephemeral rollups** (post-MVP, Phase Stretch).
- Devnet for development and pre-submission testing; mainnet for final submission demo.

## Why

- **Cost.** Compressed attestations cost ~$0.0001–$0.0008 per write — meets AC-4.2.2.
- **Composability.** Compressed accounts are queryable from any Solana RPC; verifier site doesn't need our backend.
- **Audit.** Light Protocol's contracts are deployed and audited (Neodyme, OtterSec).
- **Future-proof.** Compression is the direction of travel for high-volume Solana state. Judges recognize this.

## Why NOT the alternatives

- **Uncompressed only.** Breaks AC-4.2.2; one document with 5 signers would cost ~$0.01 in rent — not catastrophic, but we'd lose the headline cost figure.
- **MagicBlock as primary.** Adds a bridge step, mainnet settlement is async, demos become harder to verify post-event. Reserve for live co-sign sessions later.
- **Sonic / Eclipse.** Off-mission. Colosseum is Solana-mainnet-first.
- **Pure off-chain (Arweave only).** Loses the on-chain narrative. Auditors and judges expect a Solana story.

## Consequences

- We accept a Light Protocol RPC dependency. We mitigate by allowing a fallback to uncompressed accounts behind a feature flag (`LIGHT_PROTOCOL_DEGRADED=true`).
- The Anchor program imports `light-system-program` CPIs for compress/decompress. (See `programs/yoursign/programs/yoursign/Cargo.toml`.)
- Verifier code MUST be able to read both compressed and uncompressed forms (rare uncompressed fallback case).

## Reversal cost

Medium. If compression breaks, we keep the same Anchor instructions but write to uncompressed accounts. Costs more but works. Migrating *back* from a compressed-only history requires a one-time decompress sweep — supported by the compression program.
