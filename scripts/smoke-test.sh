#!/usr/bin/env bash
# smoke-test.sh — minimal post-deploy validation for YourSign.
# Usage: ./scripts/smoke-test.sh <staging|prod>
#
# Phase 0 stub. Phase 4+ implements full E2E:
# - apps/web reachable
# - apps/api /healthz returns ok
# - apps/verifier reachable
# - on-chain yoursign program account exists
# - sample document hash → sign → verify round-trip

set -euo pipefail

ENV="${1:?Usage: $0 <staging|prod>}"

case "$ENV" in
  staging)
    WEB_URL="${YOURSIGN_STAGING_WEB_URL:-https://staging.yoursign.tech}"
    API_URL="${YOURSIGN_STAGING_API_URL:-https://api.staging.yoursign.tech}"
    VERIFIER_URL="${YOURSIGN_STAGING_VERIFIER_URL:-https://verify.staging.yoursign.tech}"
    ;;
  prod)
    WEB_URL="${YOURSIGN_PROD_WEB_URL:-https://yoursign.tech}"
    API_URL="${YOURSIGN_PROD_API_URL:-https://api.yoursign.tech}"
    VERIFIER_URL="${YOURSIGN_PROD_VERIFIER_URL:-https://verify.yoursign.tech}"
    ;;
  *) echo "unknown env: $ENV"; exit 2 ;;
esac

echo "→ smoke testing $ENV"

check() {
  local name="$1"; local url="$2"
  if curl -fsS --max-time 10 "$url" >/dev/null; then
    echo "  ✓ $name $url"
  else
    echo "  ✗ $name $url"
    return 1
  fi
}

check "web"      "$WEB_URL"
check "api"      "$API_URL/healthz"
check "verifier" "$VERIFIER_URL"

echo "✓ smoke passed for $ENV"
