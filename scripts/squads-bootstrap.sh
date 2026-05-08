#!/usr/bin/env bash
# squads-bootstrap.sh — create the 3-of-5 mainnet Squads multi-sig that owns
# the program upgrade authority post-deploy.
#
# Manual: requires 5 signer pubkeys collected out-of-band (founders + cofounders
# + 2 cold-storage keys). Run only when you have all five.
#
# Output: prints MULTISIG_PDA. Save it to docs/runbooks/MAINNET-DEPLOY.md §6.

set -euo pipefail

if [ "$#" -lt 5 ]; then
  cat <<EOF >&2
usage: $0 <signer1-pubkey> <signer2-pubkey> <signer3-pubkey> <signer4-pubkey> <signer5-pubkey>

Creates a 3-of-5 Squads multi-sig on mainnet-beta funded by the current
solana CLI keypair. Requires 'squads-multisig-cli' installed:

  cargo install --git https://github.com/Squads-Protocol/v4 squads-multisig-cli --locked
EOF
  exit 2
fi

if ! command -v squads-multisig-cli >/dev/null 2>&1; then
  echo "missing squads-multisig-cli — install it:" >&2
  echo "  cargo install --git https://github.com/Squads-Protocol/v4 squads-multisig-cli --locked" >&2
  exit 1
fi

solana config set --url https://api.mainnet-beta.solana.com >/dev/null

squads-multisig-cli multisig-create \
  --threshold 3 \
  --members "$1" "$2" "$3" "$4" "$5" \
  --rpc-url https://api.mainnet-beta.solana.com
