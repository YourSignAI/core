# @yoursign/mcp

Cloudflare Worker exposing YourSign as an **MCP server** for AI agents (Claude Desktop, autonomous workers, etc.).

- **Spec**: `docs/01-spec.md` §10.4
- **ADR**: `docs/adr/0007-agent-identity-model.md` (identity), `docs/adr/0008-ai-gateway-routing.md` (LLM ingress)
- **Live URL** (post-Sprint 4): `https://mcp.yoursign.tech`

## Tool surface

| Tool | What it does | Input | Output |
| ---- | ----------- | ----- | ------ |
| `delegate` | Build the canonical delegation message + Phantom deep-link. Server never signs. | `{ principal, agent, scope, workspaceId }` | `{ message, scopeHashHex, walletDeepLink, ... }` |
| `sign_document` | Agent signs a canonical action message; caller submits `attest_agent_action` + `attest_signature` co-tx. | `{ delegationId, documentHashHex, workspaceId }` | `{ actionMessage, agentSigHex, ... }` |
| `verify` | Resolve a document on-chain via Light Protocol RPC. | `{ documentHashHex }` | `{ signatureAttestations, agentActions, ... }` |
| `revoke` | Build the canonical revoke message + Phantom deep-link. Server never signs. | `{ delegationId }` | `{ message, walletDeepLink, ... }` |

## Local dev

```sh
pnpm --filter @yoursign/mcp dev
# expects:
#   wrangler secret put AGENT_KEYPAIR_SECRET   # base64 of 32 raw ed25519 secret bytes
#   wrangler secret put AI_GATEWAY_TOKEN
#   wrangler secret put ANTHROPIC_API_KEY
```

`/healthz` returns `ok`. `/.well-known/mcp.json` is the MCP discovery manifest.

## Sensitive paths

This app falls under the auth/crypto escalation rule in `CLAUDE.md`. All changes
require a Security Analyst delegation (Gemini 2.5 Pro) per
`~/.claude/rules/delegator/`. The Worker handles agent keypairs in memory only;
private bytes never log and are zeroed after each signature.

## Why this is a stub

Sprint 2 has just kicked off. This package ships the structure (routes, env
types, tool inputs/outputs) so dependents (`apps/web`, `apps/api`,
`apps/verifier`) can integrate against a stable surface. Sprint 3 Thursday wires
the actual `@modelcontextprotocol/sdk` server transport, the Light Protocol
read path in `verify`, and submits real `register_agent` / `attest_agent_action`
/ `revoke_delegation` instructions to Solana.
