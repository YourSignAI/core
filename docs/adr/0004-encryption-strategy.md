# ADR-0004 — Client-side X25519 envelope encryption + AES-256-GCM payload

- Status: **Accepted** (2026-05-08)
- Deciders: founding team + (security review pending — see escalation below)
- Tags: crypto, privacy, foundation

## Context

Document content must be unreadable to the platform (AC-3.*). Options:

1. **Server-side AES with KMS-held keys.** Standard SaaS pattern. Platform CAN decrypt — fails our thesis.
2. **Client-side AES with passphrase.** UX disaster.
3. **X25519 envelope keys derived from Solana wallets** + per-document AES-256-GCM payload. Wallet implicitly authorizes decryption.
4. **Threshold encryption (Lit Protocol or Shamir-style).** More complex, premium-tier only.
5. **Fully homomorphic encryption.** Aspirational; not in scope.

## Decision

- **Default scheme:** Per-document **AES-256-GCM** payload key (DEK) + **X25519** envelope keys per recipient.
- **Solana Ed25519 → X25519** via `crypto_sign_ed25519_pk_to_curve25519` (libsodium primitive). Each recipient's Solana pubkey doubles as their encryption pubkey.
- **Wrapped DEK** is included in the document share record; recipient unwraps client-side using their wallet-derived secret.
- **Premium "escrow" mode:** 2-of-3 threshold encryption via Lit Protocol on Solana, used for notarized documents that may need third-party recovery.

## Why

- **Wallets are already key-managers.** Every Solana wallet exposes signing for Ed25519. Curve conversion is a known, well-tested operation.
- **No second key store.** Users don't need a separate "encryption key" — their wallet IS their encryption identity.
- **Server-blind by construction.** Even a full server compromise yields ciphertexts and wrapped DEKs the attacker can't unwrap (lacks recipient privkeys).
- **Standardized primitives.** AES-GCM (NIST), X25519 (RFC 7748), libsodium (audited).

## Why NOT the alternatives

- **Server-side KMS.** Defeats AC-3.*.
- **Passphrase-based.** Forgotten passphrases = lost documents. UX-hostile.
- **Threshold by default.** Adds complexity to the free path. Reserve for premium.
- **FHE.** Overkill, slow, immature on this primitive set.

## Consequences

- `packages/crypto` MUST be browser-compatible and identical between web and worker (or worker MUST never see plaintext — preferred).
- Worker NEVER decrypts. Worker only sees ciphertext blobs and uploads them.
- We add a **key recovery doc** (`docs/key-recovery.md` — to be written) that explicitly states: lose your wallet, lose the document. (Premium escrow mode is the answer for users who need recovery.)
- Crypto code requires Architect role + Security Analyst sign-off (Gemini 2.5 Pro via delegator) before any change merges.

## Open questions (escalated)

- [ ] Should we use a domain-separated derivation (hkdf with `yoursign-x25519-v1` info) instead of raw Ed25519→X25519? (Likely yes for forward-compat. Verifier MUST agree.)
- [ ] Privy MPC wallets: confirm the SDK exposes Ed25519 for X25519 conversion (not just signing).
- [ ] Threshold provider: Lit Protocol is the obvious pick — confirm Solana support is GA, not beta.

## Reversal cost

Medium-high. Re-encrypting historical documents requires recipient cooperation (they re-sign a re-key request). Schema is versioned (`crypto_v1`, `crypto_v2`) to allow gradual migration.
