#!/usr/bin/env bash
# bootstrap.sh — first-run setup for the YourSign monorepo.
# Idempotent. Run after `git clone`.

set -euo pipefail

YOURSIGN_ROOT="${YOURSIGN_ROOT:-$(pwd)}"
log() { printf "→ %s\n" "$*"; }
ok()  { printf "✓ %s\n" "$*"; }

# 1. Tool prerequisites
need() { command -v "$1" >/dev/null || { echo "missing: $1"; exit 1; }; }
log "checking prerequisites"
need node
need pnpm
need git
ok "node $(node --version), pnpm $(pnpm --version)"

# Optional but recommended
command -v anchor >/dev/null && ok "anchor $(anchor --version)" || log "anchor not found (install for on-chain dev)"
command -v solana >/dev/null && ok "solana $(solana --version)" || log "solana CLI not found (install for on-chain dev)"
command -v gh     >/dev/null && ok "gh $(gh --version | head -1)" || log "gh not found (install for Ralph loop)"
command -v claude >/dev/null && ok "claude CLI present" || log "claude not found (install Claude Code for Ralph)"

# 2. Workspace install
log "pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

# 3. State dirs
mkdir -p "$YOURSIGN_ROOT/.loop-state/logs"

# 4. Verify the toolchain
pnpm typecheck >/dev/null 2>&1 && ok "typecheck baseline ok" || log "typecheck has errors (expected at Phase 0)"

# 5. Print next steps
cat <<EOF

bootstrap complete.

next:
  pnpm dev                                  # all stub apps
  ./scripts/seed-sprint-issues.sh 0         # bootstrap GitHub Issues for SPRINT-0
  ./scripts/autonomous-loop.sh ralph        # start Ralph loop (requires gh + claude)
EOF
