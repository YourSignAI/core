# Runbook — `programs/yoursign` mainnet deploy

> Status: **manual, multi-sig gated**. No CI deploys to mainnet.

This is the only path to ship the YourSign Anchor program on `mainnet-beta`.
The upgrade authority is a 3-of-5 Squads multi-sig (per ADR-0002). Initial
deploy can be either:

- **Option A (recommended)** — deploy under a *throwaway* upgrade authority,
  then transfer authority to the multi-sig in a second transaction. Simpler;
  same end state.
- **Option B** — deploy directly with `--upgrade-authority <multisig-pda>`.
  Requires the multi-sig PDA to already be funded.

We use **Option A** below.

## Prereqs

- Devnet deploy is green (`./scripts/deploy-devnet.sh` ran clean; demo flow
  passes; bankrun assertions all pass once enabled).
- Solana CLI 1.18.x and Anchor 0.30.1 installed (`./scripts/setup-solana.sh`
  satisfies both).
- Squads SDK CLI installed:
  ```sh
  cargo install --git https://github.com/Squads-Protocol/v4 squads-multisig-cli --locked
  ```
- Squads multi-sig already created on mainnet with 5 signers. Note the
  multi-sig PDA (`MULTISIG_PDA` below).
- Mainnet SOL on the deploy keypair (≥3 SOL — program rent + tx fees).

## 1. Pin program-id (once; reuse across clusters)

The repo already has a program keypair at
`programs/yoursign/target/deploy/yoursign-keypair.json`. Confirm:

```sh
solana-keygen pubkey programs/yoursign/target/deploy/yoursign-keypair.json
```

Compare against `programs/yoursign/Anchor.toml` `[programs.mainnet]` and
`packages/solana-sdk/src/constants.ts`. They must agree. If they don't, run
`./scripts/setup-solana.sh` to regenerate (will rewrite both).

## 2. Build for mainnet

```sh
cd programs/yoursign
anchor build --verifiable
```

`--verifiable` builds in a Docker container so Squads / explorers can hash-match
the bytes against the source tree.

## 3. Deploy with a throwaway upgrade authority

```sh
DEPLOYER=~/.config/solana/id.json
solana config set --url https://api.mainnet-beta.solana.com
solana balance "$DEPLOYER"   # confirm ≥3 SOL

anchor deploy \
  --provider.cluster mainnet-beta \
  --provider.wallet "$DEPLOYER"
```

Capture the program account from the output. Verify via Solana Explorer.

## 4. Transfer upgrade authority to the multi-sig

```sh
PROGRAM_ID=$(solana-keygen pubkey programs/yoursign/target/deploy/yoursign-keypair.json)
MULTISIG_PDA=<paste-multisig-pda>

solana program set-upgrade-authority \
  "$PROGRAM_ID" \
  --new-upgrade-authority "$MULTISIG_PDA" \
  -k "$DEPLOYER"
```

After this point, every program upgrade requires 3 of 5 multi-sig approvals.
Verify:

```sh
solana program show "$PROGRAM_ID"
# "Authority" must be MULTISIG_PDA
```

## 5. Initialize ToolManifest

The first multi-sig action is `init_tool_manifest` (singleton). The simplest
flow: any one of the 5 signers proposes; 3 approve; one executes.

Build the unsigned tx locally (the helper script accepts a `--dry-run` that
prints the base64 transaction):

```sh
pnpm exec tsx scripts/init-tool-manifest.ts \
  --cluster mainnet-beta \
  --dry-run-multisig \
  --multisig "$MULTISIG_PDA"
```

(Dry-run mode is a TODO on the script; wire it before submission day.)

Submit the proposal via Squads CLI:

```sh
squads-multisig-cli proposal create \
  --multisig "$MULTISIG_PDA" \
  --transaction-message <base64-from-dry-run>
```

Three signers approve, one executes. Confirm `ToolManifest` PDA is funded:

```sh
solana account "$(solana program-derived-address $PROGRAM_ID 'tool-manifest')"
```

## 6. Update repo + apps with mainnet program-id

```sh
PROGRAM_ID=...
sed -i '' "s|REPLACE_WITH_MAINNET_PROGRAM_ID|${PROGRAM_ID}|g" \
  apps/api/wrangler.toml \
  apps/mcp/wrangler.toml \
  apps/worker/wrangler.toml

# Cloudflare deploys
pnpm --filter @yoursign/api deploy:prod
pnpm --filter @yoursign/mcp deploy:prod
pnpm --filter @yoursign/worker deploy:prod
pnpm --filter @yoursign/web deploy
pnpm --filter @yoursign/verifier deploy
```

## 7. Smoke test

```sh
./scripts/smoke-test.sh prod

# Then drive the demo flow once with a real wallet:
#   - delegate via mcp.yoursign.tech
#   - sign_document
#   - revoke
# Capture all 5 mainnet AgentAction tx hashes for AC-10.5.2.
```

## 8. Rollback

If anything goes wrong **before** step 4 (authority transfer), the deployer
keypair can `anchor upgrade` to a known-good binary in seconds.

After step 4, rollback requires the multi-sig. Build the new bytes, propose,
3-of-5 approve, execute:

```sh
anchor build --verifiable
squads-multisig-cli proposal create --multisig "$MULTISIG_PDA" \
  --kind upgrade \
  --buffer <buffer-account> \
  --program "$PROGRAM_ID"
```

## What this runbook is NOT

- Not automatic. No CI. No GitHub Actions on the `mainnet` branch.
- Not reversible without the multi-sig.
- Not the place to test new ix shapes — devnet first, every time.

## On mistakes

If the upgrade authority is lost (multi-sig keys irrecoverable), the program
becomes immutable. Document the multi-sig recovery story in a separate
private runbook outside this public repo.
