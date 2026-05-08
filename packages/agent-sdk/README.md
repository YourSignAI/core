# @yoursign/agent-sdk

Canonical primitives for YourSign agent delegation, scope hashing, and Ed25519 attestation.

- **Spec**: `docs/01-spec.md` §10
- **ADR**: `docs/adr/0007-agent-identity-model.md`
- **On-chain contract**: `docs/contracts/on-chain-program.md` v1.1

## Surface

```ts
import {
  canonicalDelegationMessage,
  canonicalActionMessage,
  canonicalRevokeMessage,
  canonicalScopeJson,
  hashScope,
  signMessageHash,
  verifyMessageHash,
  AgentScopeSchema,
  TOOL_IDS,
} from '@yoursign/agent-sdk';
```

## Why this package exists

The byte-string of every agent message — delegation, action, revoke — has to be **identical** in three places:

1. The principal's wallet (Phantom `signMessage`).
2. The MCP server (`apps/mcp`).
3. The on-chain program (`programs/yoursign`, reconstructed before `ed25519_program` verify).

If any of those drift by a single byte, on-chain verification fails. This package is the **single source of truth** for those bytes.

## Sensitive paths

This package falls under the crypto/auth escalation rule in `CLAUDE.md`. Any change requires:

- An ADR amendment (or a new ADR if the message format changes).
- Security Analyst delegation (Gemini 2.5 Pro per `~/.claude/rules/delegator/`).
- Conventional Commit citing `(spec:AC-10.x.y)`.

## Local dev

```sh
pnpm --filter @yoursign/agent-sdk build
pnpm --filter @yoursign/agent-sdk test
```
