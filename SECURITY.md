# Security policy

## Reporting a vulnerability

Email **security@yoursign.tech** with:

- A description of the issue.
- Steps to reproduce.
- An assessment of impact (confidentiality / integrity / availability).
- (Optional) a proof-of-concept.

We aim to acknowledge within **24 hours** and to issue a fix or mitigation within **7 days** for critical issues.

Please do **not** open a public GitHub issue for security reports.

## Scope

In scope:

- The on-chain `yoursign` program (`programs/yoursign/`).
- The crypto package (`packages/crypto/`).
- The auth flow (`apps/api/src/auth/`).
- The signing flow (`apps/web/src/(public)/sign/`).
- The verifier (`apps/verifier/`).

Out of scope (not actively monitored):

- Issues that require a compromised wallet.
- Issues that require a compromised Solana RPC.
- Issues in third-party dependencies before they're picked up by the dep ecosystem (please report upstream).

## Coordinated disclosure

We follow a 90-day coordinated disclosure window from acknowledgment. We'll credit reporters in `SECURITY-CREDITS.md` unless they ask to remain anonymous.

## Hall of fame / bounties

Pre-launch: no monetary bounty, but reporters of valid issues get permanent credit and (where possible) a complimentary lifetime premium tier.

Post-launch: a USDC bounty pool funded from premium fees (TBD).

## Security review process

- Every PR touching `packages/crypto`, `programs/yoursign`, or `apps/api/src/auth/**` requires a Security Analyst review (delegated to Gemini 2.5 Pro via the Symphony Harness — see `harness/config.yaml`).
- A human security review is required before mainnet deployment of any program upgrade.
