#!/usr/bin/env bash
# deploy-devnet.sh — anchor build → deploy → init_tool_manifest on devnet.
#
# Prereq: ./scripts/setup-solana.sh (toolchain + keypairs + airdrop).
#
# Idempotent on the build side; deploy will fail if the program account already
# exists at the same id with different bytes — use `anchor upgrade` for those
# (see runbook).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOLANA_BIN="${HOME}/.local/share/solana/install/active_release/bin"
export PATH="${SOLANA_BIN}:${PATH}"

step()   { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
red()    { printf '\033[31m%s\033[0m\n' "$*" >&2; }

solana config set --url https://api.devnet.solana.com >/dev/null
DEPLOYER="$(solana address)"
PROGRAM_KEYPAIR="${REPO_ROOT}/programs/yoursign/target/deploy/yoursign-keypair.json"

if [ ! -f "${PROGRAM_KEYPAIR}" ]; then
  red "missing ${PROGRAM_KEYPAIR}. Run ./scripts/setup-solana.sh first."
  exit 1
fi

PROGRAM_ID="$(solana-keygen pubkey "${PROGRAM_KEYPAIR}")"

step "deployer    ${DEPLOYER}"
step "program-id  ${PROGRAM_ID}"
step "cluster     devnet"

# ────────────────────────────────────────────────────────────────────────────
step "anchor build"
( cd "${REPO_ROOT}/programs/yoursign" && anchor build )

# ────────────────────────────────────────────────────────────────────────────
step "anchor deploy"
( cd "${REPO_ROOT}/programs/yoursign" && anchor deploy --provider.cluster devnet )

# ────────────────────────────────────────────────────────────────────────────
step "init_tool_manifest"
yellow "  running scripts/init-tool-manifest.ts"
pnpm exec tsx "${REPO_ROOT}/scripts/init-tool-manifest.ts" --cluster devnet

# ────────────────────────────────────────────────────────────────────────────
green ""
green "✓ Devnet deploy complete."
green "  Program: https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet"
