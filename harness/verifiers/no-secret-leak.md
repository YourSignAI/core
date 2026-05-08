# Verifier — No secret leak

## What it checks

Static scan over the diff for patterns that look like secrets or private keys:

- Solana base58 secret-key patterns (≥87 chars in a base58 alphabet, no whitespace).
- Hex strings of length 64 or 128 in `+` lines.
- `.env` keys with non-empty values being added to non-`.env*` files.
- Mnemonics (≥12 words from BIP39 wordlist) anywhere.
- AWS keys (`AKIA[0-9A-Z]{16}`), GitHub PATs (`ghp_`, `github_pat_`), Privy app secrets, Helius API keys.

## Where it runs

- Locally: pre-commit hook (`scripts/scan-secrets.ts`).
- CI: same script, hard-fails the build.

## Verdict

- **Pass:** no matches.
- **Fail:** even a single match. PR is blocked, secret rotation is required.

## False positives

Add a one-line allow with justification to `harness/verifiers/no-secret-leak.allowlist`:

```
file: packages/crypto/test/fixtures/known-test-vector.ts:42  reason: NIST test vector
```

The Architect role MUST review allowlist additions.
