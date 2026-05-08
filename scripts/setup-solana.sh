#!/usr/bin/env bash
# setup-solana.sh — idempotent installer for the Solana toolchain on macOS / Linux.
#
# Run once on a fresh machine:
#   ./scripts/setup-solana.sh
#
# Installs:
#   - solana-install (Anza distribution; pulls solana-cli 1.18.26)
#   - avm (Anchor Version Manager) via cargo
#   - anchor-cli 0.30.1 via avm
#
# After installation, generates:
#   - ~/.config/solana/id.json              (deployer keypair, devnet)
#   - programs/yoursign/target/deploy/yoursign-keypair.json (program keypair)
#
# Patches `programs/yoursign/Anchor.toml`, `programs/yoursign/src/lib.rs`,
# and `packages/solana-sdk/src/constants.ts` with the derived program-id.
#
# Idempotent: safe to re-run. Skips work that already exists.
#
# WARNING: this script does NOT touch mainnet. Mainnet deploy is documented in
# `docs/runbooks/MAINNET-DEPLOY.md` and goes through a Squads multi-sig.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOLANA_VERSION="1.18.26"
ANCHOR_VERSION="0.30.1"

red()    { printf '\033[31m%s\033[0m\n' "$*" >&2; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
step()   { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { red "missing prerequisite: $1"; exit 1; }
}

require_cmd curl
require_cmd cargo
require_cmd rustc

# ────────────────────────────────────────────────────────────────────────────
# 1. solana-install
# ────────────────────────────────────────────────────────────────────────────
step "1/6  solana-install"

SOLANA_BIN="${HOME}/.local/share/solana/install/active_release/bin"
if [ -x "${SOLANA_BIN}/solana" ]; then
  green "  ✓ solana already installed: $(${SOLANA_BIN}/solana --version)"
else
  yellow "  installing solana ${SOLANA_VERSION} via Anza installer…"
  sh -c "$(curl -sSfL https://release.anza.xyz/v${SOLANA_VERSION}/install)" \
    || sh -c "$(curl -sSfL https://release.solana.com/v${SOLANA_VERSION}/install)"
fi
export PATH="${SOLANA_BIN}:${PATH}"
green "  PATH now includes ${SOLANA_BIN}"

# ────────────────────────────────────────────────────────────────────────────
# 2. avm + anchor-cli
# ────────────────────────────────────────────────────────────────────────────
step "2/6  avm + anchor"

if command -v avm >/dev/null 2>&1; then
  green "  ✓ avm already installed: $(avm --version 2>&1 | head -1)"
else
  yellow "  installing avm via cargo…"
  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
fi

if anchor --version 2>/dev/null | grep -q "${ANCHOR_VERSION}"; then
  green "  ✓ anchor ${ANCHOR_VERSION} already active"
else
  yellow "  installing anchor ${ANCHOR_VERSION} via avm…"
  avm install "${ANCHOR_VERSION}"
  avm use "${ANCHOR_VERSION}"
fi

# ────────────────────────────────────────────────────────────────────────────
# 3. deployer keypair (devnet)
# ────────────────────────────────────────────────────────────────────────────
step "3/6  deployer keypair"

DEPLOYER_KEYPAIR="${HOME}/.config/solana/id.json"
mkdir -p "$(dirname "${DEPLOYER_KEYPAIR}")"
if [ -f "${DEPLOYER_KEYPAIR}" ]; then
  green "  ✓ deployer keypair already exists at ${DEPLOYER_KEYPAIR}"
else
  yellow "  generating deployer keypair…"
  solana-keygen new --no-bip39-passphrase -o "${DEPLOYER_KEYPAIR}"
fi

solana config set --keypair "${DEPLOYER_KEYPAIR}" >/dev/null
solana config set --url https://api.devnet.solana.com >/dev/null
DEPLOYER_PUBKEY="$(solana address)"
green "  deployer pubkey: ${DEPLOYER_PUBKEY}"

# ────────────────────────────────────────────────────────────────────────────
# 4. program keypair
# ────────────────────────────────────────────────────────────────────────────
step "4/6  program keypair"

PROGRAM_KEYPAIR_DIR="${REPO_ROOT}/programs/yoursign/target/deploy"
PROGRAM_KEYPAIR="${PROGRAM_KEYPAIR_DIR}/yoursign-keypair.json"
mkdir -p "${PROGRAM_KEYPAIR_DIR}"
if [ -f "${PROGRAM_KEYPAIR}" ]; then
  green "  ✓ program keypair already exists at ${PROGRAM_KEYPAIR}"
else
  yellow "  generating program keypair…"
  solana-keygen new --no-bip39-passphrase -o "${PROGRAM_KEYPAIR}"
fi
PROGRAM_ID="$(solana-keygen pubkey "${PROGRAM_KEYPAIR}")"
green "  program id: ${PROGRAM_ID}"

# ────────────────────────────────────────────────────────────────────────────
# 5. patch declare_id! + Anchor.toml + solana-sdk constants
# ────────────────────────────────────────────────────────────────────────────
step "5/6  patching repo with program-id"

LIB_RS="${REPO_ROOT}/programs/yoursign/src/lib.rs"
ANCHOR_TOML="${REPO_ROOT}/programs/yoursign/Anchor.toml"
SDK_CONSTANTS="${REPO_ROOT}/packages/solana-sdk/src/constants.ts"

PLACEHOLDERS=(
  "Yo1aSign1111111111111111111111111111111111"
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
)

for p in "${PLACEHOLDERS[@]}"; do
  for f in "${LIB_RS}" "${ANCHOR_TOML}" "${SDK_CONSTANTS}"; do
    if grep -q "${p}" "${f}"; then
      yellow "  patching ${f} (${p:0:8}…)"
      sed -i.bak "s|${p}|${PROGRAM_ID}|g" "${f}" && rm "${f}.bak"
    fi
  done
done
green "  ✓ program-id pinned to ${PROGRAM_ID}"

# ────────────────────────────────────────────────────────────────────────────
# 6. devnet airdrop
# ────────────────────────────────────────────────────────────────────────────
step "6/6  devnet airdrop"

BALANCE_SOL="$(solana balance --output json 2>/dev/null | python3 -c 'import sys,json; print(json.load(sys.stdin)["value"]/1e9)' 2>/dev/null || echo 0)"
if [ "${BALANCE_SOL%.*}" -ge 4 ]; then
  green "  ✓ deployer already has ${BALANCE_SOL} SOL on devnet"
else
  yellow "  airdropping 5 SOL on devnet (rate-limited; may need 2–3 attempts)…"
  for i in 1 2 3 4 5; do
    if solana airdrop 1 >/dev/null 2>&1; then
      green "    + airdrop ${i}/5 ok"
    else
      yellow "    × airdrop ${i}/5 throttled; sleeping 5s"
      sleep 5
    fi
  done
  solana balance
fi

# ────────────────────────────────────────────────────────────────────────────
green ""
green "✓ Solana toolchain ready."
echo ""
echo "Next:"
echo "  pnpm anchor:build              # cd programs/yoursign && anchor build"
echo "  ./scripts/deploy-devnet.sh     # anchor deploy + init_tool_manifest"
echo ""
echo "Persist PATH (zsh):"
echo "  echo 'export PATH=\"\$HOME/.local/share/solana/install/active_release/bin:\$PATH\"' >> ~/.zshrc"
