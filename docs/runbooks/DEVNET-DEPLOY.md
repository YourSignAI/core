# Runbook — devnet deploy

> Prereqs: pnpm install green, `pnpm typecheck` green, `pnpm test` green.

```sh
# 1. install toolchain (idempotent)
pnpm setup:solana
# Adds solana-cli + avm + anchor-cli to your PATH.
# Generates ~/.config/solana/id.json (deployer)
# Generates programs/yoursign/target/deploy/yoursign-keypair.json (program)
# Patches declare_id! + Anchor.toml + solana-sdk constants with the real id.
# Airdrops up to 5 SOL on devnet.

# 2. PATH for current shell (the installer added it to ~/.zprofile already)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# 3. confirm balance
solana balance

# 4. build + deploy
pnpm deploy:devnet
# - anchor build (BPF) → target/deploy/yoursign.so
# - anchor deploy --provider.cluster devnet
# - pnpm init:tool-manifest --cluster devnet  (singleton; idempotent)

# 5. demo flow
pnpm exec tsx scripts/demo-agent-flow.ts --cluster devnet
# Submits register_agent → attest_agent_action → revoke_delegation.
# Prints all 3 tx signatures + Solana Explorer link.
```

## Common pitfalls

- **Airdrop throttled.** Devnet faucet is rate-limited per-IP. Use VPN, retry,
  or `solana airdrop 1` 5x with `sleep 5` between calls.
- **`anchor build` fails with `cargo build-sbf` not found.** Reload your shell
  so the solana PATH is active: `exec $SHELL`.
- **`anchor deploy` fails with insufficient funds.** Each deploy costs ~2–3 SOL
  for rent. Top up.
- **Re-deploy.** `anchor deploy` always upgrades the existing program-id.
  Bytecode size change requires the deployer keypair == upgrade authority
  (default for fresh deploys).

## Verifying success

```sh
PROGRAM_ID=$(solana-keygen pubkey programs/yoursign/target/deploy/yoursign-keypair.json)
solana program show "$PROGRAM_ID"
# Authority must equal $(solana address) on a fresh deploy.

# ToolManifest PDA
solana account "$(solana program-derived-address $PROGRAM_ID 'tool-manifest' || echo skip)"
```

The Cloudflare Workers (`apps/api`, `apps/mcp`) read `PROGRAM_ID` from
`wrangler.toml`. Update the `[vars]` block (devnet env block) with the new id
if the script didn't already do it, then redeploy:

```sh
pnpm --filter @yoursign/api deploy
pnpm --filter @yoursign/mcp deploy
```

## What this is NOT

- Not for mainnet. Mainnet has a separate runbook (`MAINNET-DEPLOY.md`) with
  multi-sig gates.
- Not idempotent for the program account. Re-running `anchor deploy` upgrades
  the on-chain bytecode in place, but `init_tool_manifest` is one-shot — the
  helper short-circuits if the PDA exists.
