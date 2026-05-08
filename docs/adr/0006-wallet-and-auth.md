# ADR-0006 — Wallets via Solana Wallet Adapter; auth via SIWS; Privy for embedded wallets

- Status: **Accepted** (2026-05-08)
- Deciders: founding team
- Tags: identity, auth, ux

## Context

We need to support both crypto-native users (with Phantom/Backpack/Solflare) and crypto-curious users (sign in with email/Google/Apple, no seed phrase). The platform itself needs sessions.

Options for wallet integration:

1. **Solana Wallet Adapter** + **Privy** (embedded MPC wallets) — picked up from the prototype.
2. **Wallet Adapter only.** Excludes the email-only persona — fatal for the freelance market.
3. **Privy only.** Excludes the crypto-native persona — bad signal at Colosseum.
4. **Magic.link / Web3Auth.** Comparable to Privy; Privy's docs and Solana support are stronger.
5. **Roll our own MPC.** Insane in four weeks.

Options for platform auth:

1. **SIWS — Sign-In with Solana** (CAIP-122 message + nonce, off-chain).
2. **OAuth bearer tokens** from Privy.
3. **JWT issued by our API after a wallet handshake.**

## Decision

- **Wallet stack:** Solana Wallet Adapter for external wallets + Privy for embedded MPC wallets. Both surface the same interface (`WalletInterface`) to the rest of the app.
- **Platform auth:** **SIWS** (Sign-In with Solana). Server issues a session JWT after verifying the SIWS message.
- **Privy session:** When user authenticates via Privy, the SDK provides a Solana keypair; we still run SIWS on top of it for platform session uniformity.

## Why

- **One auth model end-to-end.** Whether a user has Phantom or a Privy embedded wallet, they SIWS the same way. Server logic doesn't branch.
- **No password store.** Less attack surface; LGPD-friendlier.
- **CAIP-122 standard.** Off-chain message + nonce + audience + statement is the cross-wallet standard.
- **Privy MPC** keeps custody with the user (shards across user device + Privy + recovery), which preserves AC-2.3.1.

## Why NOT the alternatives

- **Wallet Adapter only.** ~70% of our target market doesn't have a wallet. Fatal.
- **Privy only.** No power-user story for crypto-native customers.
- **Magic.link / Web3Auth.** Privy's Solana-native flow is the most polished; their team is responsive.
- **OAuth bearer.** Doesn't bind the session to a wallet. Replay risk.

## Consequences

- `packages/solana-sdk` exports a unified `WalletInterface` consumed by `apps/web` and `apps/verifier`.
- Privy's SDK is loaded only on the client (no server-side dep); fallback path with Wallet Adapter must be tested without Privy keys present.
- Session JWT lifetime: 24h. Refresh requires a fresh SIWS signature.
- We MUST verify the SIWS `Audience` matches our domain to prevent cross-site replay.

## Reversal cost

Low. SIWS implementations are stateless on the wallet side; swapping Privy for another embedded-wallet provider only changes one adapter.
