# ADR-0003 — Premium tier paid in USDC via Solana Pay (no native token)

- Status: **Accepted** (2026-05-08)
- Deciders: founding team
- Tags: payments, money, business-model

## Context

We monetize premium features. We must NOT introduce friction for the free tier (which is most users). Options:

1. **Native YourSign token (SPL).** Discounted via token-gating. Adds a token-launch problem.
2. **Stripe / fiat.** Off-mission for a Solana hackathon and adds compliance baggage in BR/LATAM.
3. **USDC via Solana Pay** (Circle's USDC SPL on Solana, `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`).
4. **Multi-stablecoin.** Adds complexity, marginal benefit for the hackathon scope.

## Decision

**USDC via Solana Pay only.**

- Single payment asset: `USDC SPL`.
- Single rail: **Solana Pay transaction requests** (`solana:` URI).
- Premium triggers only — never gate basic signing.

## Why

- **Mainnet-native.** USDC is the digital dollar most LATAM teams already touch.
- **Solana Pay is purpose-built.** Wallets understand it; transaction requests give us server-side signing of the payment payload (we can attach metadata like `documentId`).
- **No token launch.** Custom tokens are a regulatory + speculative-attack distraction that doesn't help the hackathon goal.
- **Compliance simpler.** USDC has Circle attestations; we never custody fiat or hold balances.

## Why NOT the alternatives

- **Native token.** Token issuance, vesting, market-making, tax — none of this helps a four-week hackathon. Worse, it's the failure mode judges have seen 50 times.
- **Stripe.** Off-Solana. Slow KYC for new accounts in LATAM. Also we'd need a card form on a Solana-native UX, which clashes.
- **Multi-stablecoin.** Complexity vs. value: USDC liquidity on Solana is dominant.

## Consequences

- All premium pricing is denominated and stored in USDC base units (1 USDC = 1,000,000 units).
- The on-chain `PricingConfig` account is the single source of truth for prices. (Future-proofs us against client tampering.)
- We accept USDC custody risk minimally — each payment goes to a program-owned escrow/treasury PDA, claimed by the platform owner via a separate flow.
- Free tier MUST remain truly free: no hidden gas, no surprise unlocks. (See AC-6.1.1.)

## Reversal cost

Low. We could add another stablecoin (USDT, EURC) by extending `PricingConfig`'s allowed mints. We could not easily remove USDC after launch — it's the contract.
