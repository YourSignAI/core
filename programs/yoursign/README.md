# `programs/yoursign`

The Anchor program. Implements `docs/contracts/on-chain-program.md`.

## Toolchain

- Anchor (latest stable)
- Rust 1.79+
- Solana CLI 2.x
- Light Protocol's `light-system-program` for compressed account CPIs

## Layout

```
programs/yoursign/
├── Anchor.toml
├── Cargo.toml
├── programs/yoursign/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── instructions/
│       │   ├── initialize_pricing.rs
│       │   ├── register_document.rs
│       │   ├── attest_signature.rs
│       │   ├── attest_decline.rs
│       │   ├── pay_for_premium.rs
│       │   └── notarize_counter.rs
│       ├── state/
│       │   ├── pricing.rs
│       │   ├── document.rs
│       │   ├── attestation.rs
│       │   └── escrow.rs
│       └── error.rs
├── tests/
│   ├── unit/                 # bankrun-based
│   └── integration/          # solana-test-validator
└── migrations/
```

## Test plan

See `docs/contracts/on-chain-program.md#test-plan`.

## Deployment

- **Devnet** during development. Program ID committed in `Anchor.toml`.
- **Mainnet** for hackathon submission. Upgrade authority = 3-of-5 Squads multi-sig.

## Status

Stub. Phase 3.
