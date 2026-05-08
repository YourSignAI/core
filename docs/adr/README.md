# Architecture Decision Records

> Reversible decisions, numbered, dated, and cited from code.

## Index

| # | Title | Status |
| - | ----- | ------ |
| [0001](./0001-monorepo-pnpm-turborepo.md) | Monorepo with pnpm + Turborepo | Accepted |
| [0002](./0002-solana-and-zk-compression.md) | Solana mainnet + Light Protocol ZK Compression | Accepted |
| [0003](./0003-usdc-payments-solana-pay.md) | Premium tier paid in USDC via Solana Pay | Accepted |
| [0004](./0004-encryption-strategy.md) | Client-side X25519 envelope + AES-256-GCM | Accepted |
| [0005](./0005-pdf-processing.md) | pdf-lib + pdfjs-dist + custom canonicalization | Accepted |
| [0006](./0006-wallet-and-auth.md) | Wallet Adapter + Privy + SIWS | Accepted |
| [0007](./0007-agent-identity-model.md) | On-chain agent delegation, scoped attestation, revocable | Accepted |
| [0008](./0008-ai-gateway-routing.md) | Cloudflare AI Gateway → Anthropic primary, Workers AI fallback | Accepted |

## How to write a new ADR

1. Copy the next number.
2. Fill: Context, Decision, Why, Why NOT alternatives, Consequences, Reversal cost.
3. Open a PR. Title: `ADR-NNNN: <title>`.
4. The Architect role (or a human Architect-equivalent) signs off.
5. After merge, cite it in code: `// see ADR-NNNN`.

## Replacing an ADR

Don't edit history. Write a new ADR with status `Supersedes ADR-NNNN`, and update the old one's status to `Superseded by ADR-MMMM`.
