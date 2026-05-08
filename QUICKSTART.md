# QUICKSTART — local dev

Minimum to get a green checkmark from this repo on a fresh clone.

## Prereqs

- Node ≥ 24 (`.nvmrc` pinned)
- pnpm ≥ 9 (`package.json` `packageManager`)
- For Anchor: Rust + Solana CLI 1.18 + Anchor 0.30
- For Cloudflare deploys: `wrangler` (installed as workspace dev dep)

```sh
nvm use
corepack enable
```

## Install

```sh
pnpm install
```

## Verify the workspace is sane

```sh
pnpm typecheck
pnpm test
```

If both go green, the workspace is wired correctly. Test coverage at this stage:

- `@yoursign/agent-sdk` — canonical message KAT, scope hash determinism
- `@yoursign/crypto` — canonical signing message AC-4.1.1, ed25519 sign/verify, AES-GCM seal/open, X25519 wrap/unwrap roundtrip
- `@yoursign/api` — PII redaction (email / CPF / CNPJ / phone)
- `@yoursign/mcp` — MCP discovery manifest exposes 4 tools

## Run the apps

Each app is a separate pnpm filter. Run several in parallel terminals.

```sh
# Next.js web app — http://localhost:3000
pnpm dev:web

# Public verifier — http://localhost:3001
pnpm dev:verifier

# API Worker — http://127.0.0.1:8787 (wrangler dev)
pnpm dev:api

# MCP Worker — http://127.0.0.1:8788 (wrangler dev)
pnpm dev:mcp
```

`wrangler dev` runs locally without touching the Cloudflare cloud (uses Miniflare). KV / R2 / Hyperdrive bindings get local mocks. The placeholder IDs in `wrangler.toml` are only consulted on `wrangler deploy`.

## Anchor program

```sh
cd programs/yoursign
cargo check                # compile-only sanity (needs solana-program toolchain)
anchor build               # full build (Solana CLI required)
```

Bankrun-style integration tests (`tests/agent-flow.test.ts`) are stubbed with
`it.skip` until the IDL is generated. Once `anchor build` produces the IDL,
swap the stubs for real assertions (Sprint 2 Thursday per `SPRINT-2.md`).

## Wrangler secrets

Each Worker reads its secrets from `wrangler secret put`, never from `.env`.
Required for full functionality (you can dev without these — see fallbacks):

- `apps/api`:
  - `SIWS_JWT_SECRET` (32 random bytes, base64)
  - `AI_GATEWAY_TOKEN`
  - `ANTHROPIC_API_KEY`
- `apps/mcp`:
  - `AGENT_KEYPAIR_SECRET` (base64 of 32 raw ed25519 secret bytes — demo only; production stores per-workspace keys in KV)
  - `AI_GATEWAY_TOKEN`
  - `ANTHROPIC_API_KEY`

Generate the demo agent secret:

```sh
node -e "const b=require('crypto').randomBytes(32);console.log(b.toString('base64'))"
```

## What does NOT yet work end-to-end (and where the gap is)

- **Anchor program** is scaffolded and the canonical-message reconstruction is
  byte-for-byte identical to `@yoursign/agent-sdk`, but the bankrun assertions
  are stubbed. Sprint 2 Thursday wires them.
- **Light Protocol read path** (verifier site → on-chain proof) is stubbed.
  Sprint 3 Thursday wires `@lightprotocol/stateless.js`.
- **MCP transport** is HTTP/JSON; full streamable HTTP per the SDK lands Sprint
  3 Thursday.
- **Phantom signMessage flow** in `apps/web /agents` works in the browser. The
  on-chain `register_agent` submission is wired Sprint 3 Thursday.

## Cleanup

```sh
pnpm clean
```
