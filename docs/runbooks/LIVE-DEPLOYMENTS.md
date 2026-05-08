# Live deployments — devnet / staging

> Last updated: 2026-05-08. Cloudflare account `Leandrobar93@gmail.com`
> (`450e01c6b878357ff7bccd2d4b23123e`). Solana cluster: **devnet**.

## URLs

| Service | URL | Status |
| ------- | --- | ------ |
| Web app | https://yoursign-web.videostreaminginc.workers.dev | live |
| Public verifier | https://yoursign-verifier.videostreaminginc.workers.dev | live |
| API | https://yoursign-api.videostreaminginc.workers.dev | live |
| MCP server | https://yoursign-mcp.videostreaminginc.workers.dev | live |
| Worker (queue consumer) | https://yoursign-worker.videostreaminginc.workers.dev | live (idle) |

Custom domains (`yoursign.tech`, `verify.yoursign.tech`, `api.yoursign.tech`,
`mcp.yoursign.tech`) cut over once nameservers point to Cloudflare. Tracked in
`docs/05-sprints/SPRINT-4.md` Wednesday.

## Cloudflare resources

| Kind | Name | ID |
| ---- | ---- | -- |
| R2 bucket | `yoursign-agent-scopes` (devnet) | — |
| R2 bucket | `yoursign-agent-scopes-prod` (mainnet) | — |
| KV | `MCP_SESSIONS` | `a2f340d43e214fb4823ffbde2dddaf01` |
| KV | `SIWS_NONCES` | `85b5514e64c044ee9df5667167d82f9d` |

## Wrangler secrets in place

| Worker | Secret | Source |
| ------ | ------ | ------ |
| `yoursign-api` | `SIWS_JWT_SECRET` | random 32B base64url |
| `yoursign-api` | `PRIVY_APP_ID` | from videoengine `.env.local` |
| `yoursign-api` | `PRIVY_APP_SECRET` | from videoengine `.env.local` |
| `yoursign-mcp` | `AGENT_KEYPAIR_SECRET` | random 32B base64 |
| `yoursign-web` (public env) | `NEXT_PUBLIC_PRIVY_APP_ID` | inlined at build time |

Secrets still pending (block AI Gateway integration):
- `AI_GATEWAY_TOKEN` (api + mcp)
- `ANTHROPIC_API_KEY` (api + mcp)

## Privy

Auth provider: Privy (ADR-0006). Config:
- App ID (public): `cmo1htgvr006b0cla9gkwxm3b`
- Login methods: email · Google · Apple · Phantom · Backpack · Solflare · WalletConnect
- Embedded wallet: created automatically for users who login without one
- Theme: light, accent `#ff385c` (rausch)

## Solana

| Item | Value |
| ---- | ----- |
| Cluster | `https://api.devnet.solana.com` |
| Deployer pubkey | `2uNHhUNc2Rgv4CizVcfJzsdsi5WSXCyUTfKzvZfoDYif` |
| Program-id | `35RbwNgx9Em28mMLZ6iWzjCnaTd4tD2NWuxrHqR76M8X` |
| Program-data | `ATDeHCpZckNVLSbmGuCS15ASFNfSVFqPLnahAQV9sgak` |
| Bytes | 364 256 |
| Authority | `2uNHhUNc2Rgv4CizVcfJzsdsi5WSXCyUTfKzvZfoDYif` (deployer; multi-sig only on mainnet) |
| Deployed in slot | 461 000 828 |
| Deployer balance after deploy | ~2.46 SOL |
| Solana Explorer | https://explorer.solana.com/address/35RbwNgx9Em28mMLZ6iWzjCnaTd4tD2NWuxrHqR76M8X?cluster=devnet |

## Live smoke tests

```sh
curl https://yoursign-api.videostreaminginc.workers.dev/healthz                 # → ok
curl https://yoursign-mcp.videostreaminginc.workers.dev/healthz                 # → ok
curl https://yoursign-mcp.videostreaminginc.workers.dev/.well-known/mcp.json    # → 4 tools
curl https://yoursign-web.videostreaminginc.workers.dev/                        # → landing
curl https://yoursign-verifier.videostreaminginc.workers.dev/                   # → drop PDF
```

E2E delegate tool — proves AC-10.1.4 (R2 anchored = re-hash matches):

```sh
curl -X POST https://yoursign-mcp.videostreaminginc.workers.dev/tools/delegate \
  -H "content-type: application/json" \
  -d '{
    "principal": "<pubkey>",
    "agent": "<agent_pubkey>",
    "workspaceId": "demo",
    "scope": {
      "tools": ["sign_document","verify"],
      "documents": "any",
      "spendCapMicroUsdc": 0,
      "expiresAt": "2026-06-08T00:00:00Z"
    }
  }'
```

Returns `scopeHashHex`. Verify with:

```sh
HASH=<scopeHashHex>
wrangler r2 object get "yoursign-agent-scopes/${HASH}" --file /tmp/r2.json
shasum -a 256 /tmp/r2.json   # MUST match $HASH
```

## Open follow-ups

1. **Devnet airdrop**: cluster-wide 429 today. Manual `https://faucet.solana.com`
   or transfer from existing wallet to deployer pubkey.
2. **`anchor build`** finishes downloading platform-tools (~700MB tarball).
   First-run only. `programs/yoursign/target/deploy/yoursign.so` will appear.
3. **`anchor deploy`** waits on (1) + (2). Then `pnpm init:tool-manifest`.
4. **`apps/web /agents` register_agent submission** — wires Phantom signMessage
   output into the on-chain ix. Sprint 3 Thursday.
5. **AI Gateway secrets** + Anthropic key.
6. **Custom domains** cut over (Sprint 4 Wednesday).
7. **Mainnet deploy** — multi-sig path per `docs/runbooks/MAINNET-DEPLOY.md`.
