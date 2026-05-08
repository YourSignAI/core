#!/usr/bin/env bash
# seed-sprint-issues.sh — create GitHub Issues from a sprint markdown file.
# Usage: ./scripts/seed-sprint-issues.sh <sprint-number>
# Example: ./scripts/seed-sprint-issues.sh 0
#
# Reads docs/05-sprints/SPRINT-N.md and creates one issue per task entry in
# Mon/Tue/Wed/Thu/Fri sections. Each issue is labeled with sprint, day, phase, area.
#
# Idempotent: re-running does not create duplicates (matches by title).

set -euo pipefail

REPO="${YOURSIGN_REPO:-YourSignAI/core}"
SPRINT_NUM="${1:?Usage: $0 <sprint-number>}"
YOURSIGN_ROOT="${YOURSIGN_ROOT:-$(pwd)}"
SPRINT_FILE="$YOURSIGN_ROOT/docs/05-sprints/SPRINT-${SPRINT_NUM}.md"

[ -f "$SPRINT_FILE" ] || { echo "sprint file not found: $SPRINT_FILE"; exit 1; }
command -v gh >/dev/null || { echo "gh CLI required"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh not authenticated; run 'gh auth login'"; exit 1; }

log() { printf "→ %s\n" "$*"; }
ok()  { printf "✓ %s\n" "$*"; }
warn(){ printf "! %s\n" "$*"; }

# Ensure required labels exist
ensure_label() {
  local name="$1"; local color="$2"; local desc="${3:-}"
  if ! gh label list --repo "$REPO" --search "$name" --json name -q '.[].name' | grep -qx "$name"; then
    gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" 2>/dev/null || true
  fi
}

log "ensuring base labels exist on $REPO"

# status (mutually exclusive)
ensure_label "todo"        "ededed" "Ready to be picked up"
ensure_label "in-progress" "0e8a16" "Work in progress"
ensure_label "blocked"     "d93f0b" "Blocked on external action"
ensure_label "rework"      "d4c5f9" "Reviewer requested changes"
ensure_label "done"        "5319e7" "Merged and closed"
ensure_label "cancelled"   "999999" "Will not do"

# escalation
ensure_label "needs-architect"        "f9d0c4" "Architect role must draft an ADR"
ensure_label "needs-security-analyst" "b60205" "Crypto / on-chain / auth review required"

# sprint
ensure_label "sprint-${SPRINT_NUM}" "1d76db" "Sprint ${SPRINT_NUM}"

# day
for d in mon tue wed thu fri; do
  ensure_label "day-${d}" "fbca04" "Sprint day ${d}"
done

# Google Design Sprint phase
ensure_label "phase-understand" "c2e0c6" "Discovery / context"
ensure_label "phase-diverge"    "c2e0c6" "Ideate alternatives"
ensure_label "phase-decide"     "c2e0c6" "Lock scope"
ensure_label "phase-prototype"  "c2e0c6" "Build minimum"
ensure_label "phase-validate"   "c2e0c6" "Real-world test"

# area (workspace-aligned)
for a in web api worker verifier core-domain pdf-engine solana-sdk crypto ui schemas config programs-yoursign harness infra docs spec adr ci; do
  ensure_label "area-${a}" "bfd4f2" "Code area: ${a}"
done

# misc
ensure_label "bug" "ee0701" "A defect"
ensure_label "adr" "5319e7" "Architecture decision request"

ok "labels ready"

day_phase() {
  case "$1" in
    mon) echo "understand" ;;
    tue) echo "diverge" ;;
    wed) echo "decide" ;;
    thu) echo "prototype" ;;
    fri) echo "validate" ;;
  esac
}

create_issue_if_missing() {
  local day="$1"; local subject="$2"; local body="$3"; local extra_labels="${4:-}"
  local phase
  phase="$(day_phase "$day")"

  local title="[s${SPRINT_NUM}-${day}] ${subject}"

  if gh issue list --repo "$REPO" --state all --search "\"$title\" in:title" --json title -q '.[].title' | grep -qx "$title"; then
    warn "exists: $title"
    return
  fi

  local labels="sprint-${SPRINT_NUM},day-${day},phase-${phase},todo"
  [ -n "$extra_labels" ] && labels="${labels},${extra_labels}"

  log "creating: $title"
  local issue_url
  issue_url="$(gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels")"
  ok "created: $issue_url"

  local issue_num
  issue_num="$(echo "$issue_url" | grep -oE '/[0-9]+$' | tr -d '/')"
  gh issue comment "$issue_num" --repo "$REPO" --body "## Symphony Workpad

**Env**: <pending>
**Spec refs**: <fill from issue body>

### Plan
- [ ] (Claude Code populates)

### Acceptance criteria
- [ ] (mirror from sprint file day section + spec ACs)

### Validation
- [ ] (per sprint Friday gate)

### Notes
- (free form, append-only)

### Builder block (if introducing new capability)
| Input | Value |
|---|---|
| Goal | |
| Hierarchy | |
| Specs | |
| Workflow | |
| Tools | |
| Context | |

### Verifier hints
- spec citation:
- contract conformance:
- ADR (if applicable):
- lineage block (if porting):
" >/dev/null
}

case "$SPRINT_NUM" in
  0)
    BODY_TEMPLATE="See \`docs/05-sprints/SPRINT-0.md\` and \`docs/03-symphony-harness.md\`.

Source plan: docs/05-sprints/SPRINT-0.md
Spec: docs/01-spec.md (foundation only — no ACs hit yet)
Roadmap: docs/04-roadmap.md Phase 0

This issue is auto-generated from the sprint file. Update the workpad comment as work progresses."

    create_issue_if_missing "mon" "Wire pnpm + Turborepo install (T0.1)"           "$BODY_TEMPLATE" "area-infra"
    create_issue_if_missing "mon" "Per-package tsconfigs extending base (T0.2)"     "$BODY_TEMPLATE" "area-config"
    create_issue_if_missing "mon" "@yoursign/config eslint + prettier (T0.2)"      "$BODY_TEMPLATE" "area-config"
    create_issue_if_missing "tue" "Stub apps/web Next.js 16 App Router (T0.5)"      "$BODY_TEMPLATE" "area-web"
    create_issue_if_missing "tue" "Stub apps/api Fastify /healthz (T0.5)"           "$BODY_TEMPLATE" "area-api"
    create_issue_if_missing "tue" "Stub apps/worker BullMQ-or-Queues consumer (T0.5)" "$BODY_TEMPLATE" "area-worker"
    create_issue_if_missing "tue" "Stub apps/verifier Next.js 16 read-only (T0.5)"  "$BODY_TEMPLATE" "area-verifier"
    create_issue_if_missing "wed" "Stub packages: schemas, core-domain, pdf-engine (T0.6)" "$BODY_TEMPLATE" "area-schemas,area-core-domain,area-pdf-engine"
    create_issue_if_missing "wed" "Stub packages: solana-sdk, crypto, ui (T0.6)"    "$BODY_TEMPLATE" "area-solana-sdk,area-crypto,area-ui"
    create_issue_if_missing "wed" "Anchor program scaffold programs/yoursign (T0.4)" "$BODY_TEMPLATE" "area-programs-yoursign"
    create_issue_if_missing "thu" "CI: typecheck + lint + test on every PR (T0.3)"  "$BODY_TEMPLATE" "area-ci"
    create_issue_if_missing "thu" "CI: anchor build on programs/** changes (T0.3)"  "$BODY_TEMPLATE" "area-ci"
    create_issue_if_missing "thu" "CI: Symphony verifiers (spec-citation, no-secret-leak, ADR-presence, lineage) (T0.7)" "$BODY_TEMPLATE" "area-ci,area-harness"
    create_issue_if_missing "thu" "Harness prompts + verifiers committed (T0.7)"    "$BODY_TEMPLATE" "area-harness"
    create_issue_if_missing "fri" "Bootstrap script + smoke-test wiring"            "$BODY_TEMPLATE" "area-infra"
    create_issue_if_missing "fri" "Sprint 0 retro + gate: pnpm dev runs all stub apps; anchor build OK" "$BODY_TEMPLATE" "area-docs"
    ;;

  1)
    BODY_TEMPLATE="See \`docs/05-sprints/SPRINT-1.md\` and Phase 1 + Phase 2 in \`docs/04-roadmap.md\`.

Source plan: docs/05-sprints/SPRINT-1.md
Spec sections: docs/01-spec.md §1 (Document upload + canon), §2 (Identity + wallet)

This issue is auto-generated from the sprint file. Update the workpad comment as work progresses."

    create_issue_if_missing "mon" "Audit pdfjs-dist + pdf-lib API for canonicalization (AC-1.2.1)" "$BODY_TEMPLATE" "area-pdf-engine"
    create_issue_if_missing "mon" "Audit Solana Wallet Adapter + Privy SDKs (AC-2.1.*)" "$BODY_TEMPLATE" "area-solana-sdk"
    create_issue_if_missing "mon" "Document yoursign.canon.v1 algorithm (ADR-0005)" "$BODY_TEMPLATE" "area-pdf-engine,area-spec"
    create_issue_if_missing "tue" "Sketch field detection heuristics (AC-1.3.1)"      "$BODY_TEMPLATE" "area-pdf-engine"
    create_issue_if_missing "tue" "Sketch SIWS challenge/verify flow (AC-2.3.2)"      "$BODY_TEMPLATE" "area-api"
    create_issue_if_missing "wed" "Lock canonicalization spec — frozen at v1"          "$BODY_TEMPLATE" "area-spec"
    create_issue_if_missing "wed" "Lock fields detected in MVP (signature, initial, date)" "$BODY_TEMPLATE" "area-spec"
    create_issue_if_missing "thu" "Implement packages/pdf-engine canon + sha256 (AC-1.2.*)" "$BODY_TEMPLATE" "area-pdf-engine"
    create_issue_if_missing "thu" "Implement packages/pdf-engine field detection (AC-1.3.*)" "$BODY_TEMPLATE" "area-pdf-engine"
    create_issue_if_missing "thu" "Implement apps/web Landing + Editor screens (AC-1.1.*)" "$BODY_TEMPLATE" "area-web,area-ui"
    create_issue_if_missing "thu" "Implement apps/api POST /documents + /canon (contract:api#documents)" "$BODY_TEMPLATE" "area-api"
    create_issue_if_missing "thu" "Implement SIWS challenge + verify (AC-2.3.2)"      "$BODY_TEMPLATE" "area-api,area-solana-sdk"
    create_issue_if_missing "thu" "Wire Wallet Adapter + Privy in apps/web (AC-2.1.*)" "$BODY_TEMPLATE" "area-web,area-solana-sdk"
    create_issue_if_missing "fri" "E2E: drop PDF, see fields, hash matches across browsers (Phase 1 gate)" "$BODY_TEMPLATE" "area-web"
    create_issue_if_missing "fri" "E2E: login Phantom + login Privy email on preview (Phase 2 gate)" "$BODY_TEMPLATE" "area-web"
    create_issue_if_missing "fri" "Sprint 1 retro + gate validation"                  "$BODY_TEMPLATE" "area-docs"
    ;;

  2)
    BODY_TEMPLATE="See \`docs/05-sprints/SPRINT-2.md\` and Phase 3 in \`docs/04-roadmap.md\`.

Source plan: docs/05-sprints/SPRINT-2.md
Spec sections: docs/01-spec.md §3 (encryption), §4 (sign + anchor)
ADRs: 0002 (Solana ZK Compression), 0004 (encryption strategy)
Sprint 1 retro: docs/05-sprints/SPRINT-1-RETRO.md

⚠️  Crypto + on-chain code REQUIRES Architect + Security Analyst sign-off.

This issue is auto-generated from the sprint file. Update the workpad comment as work progresses."

    create_issue_if_missing "mon" "Audit Light Protocol stateless.js for compressed writes (ADR-0002)" "$BODY_TEMPLATE" "area-solana-sdk"
    create_issue_if_missing "mon" "Audit libsodium Ed25519↔X25519 conversion (ADR-0004)" "$BODY_TEMPLATE" "area-crypto,needs-security-analyst"
    create_issue_if_missing "mon" "Define canonical signing message bytes (AC-4.1.1)"  "$BODY_TEMPLATE" "area-spec,area-crypto"
    create_issue_if_missing "tue" "Sketch signature attestation account layout (contract:on-chain-program#SignatureAttestation)" "$BODY_TEMPLATE" "area-programs-yoursign"
    create_issue_if_missing "tue" "Sketch DEK wrap/unwrap envelope flow (AC-3.1.*)"    "$BODY_TEMPLATE" "area-crypto"
    create_issue_if_missing "tue" "Sketch worker anchoring + retry (AC-4.2.1)"         "$BODY_TEMPLATE" "area-worker"
    create_issue_if_missing "wed" "Lock Anchor instruction set (register_document, attest_signature, attest_decline, complete_document)" "$BODY_TEMPLATE" "area-programs-yoursign,needs-architect"
    create_issue_if_missing "wed" "Lock crypto domain separation (yoursign-x25519-v1)" "$BODY_TEMPLATE" "area-crypto,needs-security-analyst"
    create_issue_if_missing "thu" "Implement Anchor register_document + attest_signature ix" "$BODY_TEMPLATE" "area-programs-yoursign,needs-security-analyst"
    create_issue_if_missing "thu" "Implement packages/crypto AES-GCM + X25519 wrap (AC-3.1.*)" "$BODY_TEMPLATE" "area-crypto,needs-security-analyst"
    create_issue_if_missing "thu" "Implement apps/worker anchoring via Light Protocol (AC-4.2.1)" "$BODY_TEMPLATE" "area-worker"
    create_issue_if_missing "thu" "Implement apps/web sign prompt + Phantom signMessage (AC-4.1.2)" "$BODY_TEMPLATE" "area-web"
    create_issue_if_missing "thu" "Implement complete_document + audit appendix embed (AC-4.3.*)" "$BODY_TEMPLATE" "area-pdf-engine,area-programs-yoursign"
    create_issue_if_missing "fri" "E2E: 2-party signing flow on devnet"                "$BODY_TEMPLATE" "area-web"
    create_issue_if_missing "fri" "Measure attestation cost p99 ≤ \$0.001 (AC-4.2.2)" "$BODY_TEMPLATE" "area-worker"
    create_issue_if_missing "fri" "Sprint 2 retro + Friday gate"                       "$BODY_TEMPLATE" "area-docs"
    ;;

  3)
    BODY_TEMPLATE="See \`docs/05-sprints/SPRINT-3.md\` and Phases 4 + 5 in \`docs/04-roadmap.md\`.

Source plan: docs/05-sprints/SPRINT-3.md
Spec sections: docs/01-spec.md §5 (verifier), §6 (USDC payments)
ADRs: 0003 (USDC + Solana Pay)

This issue is auto-generated from the sprint file. Update the workpad comment as work progresses."

    create_issue_if_missing "mon" "Audit @solana/pay TransactionRequest API (AC-6.2.1)" "$BODY_TEMPLATE" "area-solana-sdk"
    create_issue_if_missing "mon" "Audit Light Protocol read-only client perf"          "$BODY_TEMPLATE" "area-verifier"
    create_issue_if_missing "tue" "Sketch verifier UX (drop PDF + paste docId)"         "$BODY_TEMPLATE" "area-verifier,area-ui"
    create_issue_if_missing "tue" "Sketch Solana Pay tx-request payload (memo with docId)" "$BODY_TEMPLATE" "area-api"
    create_issue_if_missing "wed" "Lock premium feature triggers (notarize, threshold, extra signers)" "$BODY_TEMPLATE" "area-spec"
    create_issue_if_missing "wed" "Lock PricingConfig on-chain shape"                   "$BODY_TEMPLATE" "area-programs-yoursign"
    create_issue_if_missing "thu" "Implement apps/verifier full hash+sig+merkle check (AC-5.1.*)" "$BODY_TEMPLATE" "area-verifier"
    create_issue_if_missing "thu" "Implement solana-sdk/bin/verify.ts CLI (AC-5.2.1)"   "$BODY_TEMPLATE" "area-solana-sdk"
    create_issue_if_missing "thu" "Implement Anchor pay_for_premium + EscrowVault"      "$BODY_TEMPLATE" "area-programs-yoursign,needs-security-analyst"
    create_issue_if_missing "thu" "Implement apps/api Solana Pay tx-request endpoint (AC-6.2.1)" "$BODY_TEMPLATE" "area-api"
    create_issue_if_missing "thu" "Wire notarize stub flow front-to-back (AC-7.3.1 stub)" "$BODY_TEMPLATE" "area-api,area-web"
    create_issue_if_missing "fri" "E2E: verify a signed PDF without our backend"        "$BODY_TEMPLATE" "area-verifier"
    create_issue_if_missing "fri" "E2E: pay 1 USDC, see notarize counter-sig appear"    "$BODY_TEMPLATE" "area-web"
    create_issue_if_missing "fri" "Sprint 3 retro + Friday gate"                        "$BODY_TEMPLATE" "area-docs"
    ;;

  4)
    BODY_TEMPLATE="See \`docs/05-sprints/SPRINT-4.md\` and Phase 6 in \`docs/04-roadmap.md\`.

Source plan: docs/05-sprints/SPRINT-4.md
Spec sections: docs/01-spec.md §7 (audit), §8 (perf budget)
Strategy: docs/05-hackathon-strategy.md

This issue is auto-generated from the sprint file. Update the workpad comment as work progresses."

    create_issue_if_missing "mon" "Audit audit_event coverage vs contracts/events.md"   "$BODY_TEMPLATE" "area-api"
    create_issue_if_missing "mon" "Audit Lighthouse on apps/web + apps/verifier"        "$BODY_TEMPLATE" "area-web,area-verifier"
    create_issue_if_missing "tue" "Sketch demo script + 2-min video storyboard"         "$BODY_TEMPLATE" "area-docs"
    create_issue_if_missing "tue" "Sketch hackathon submission one-pager"               "$BODY_TEMPLATE" "area-docs"
    create_issue_if_missing "wed" "Lock demo URL + verifier URL final domains"          "$BODY_TEMPLATE" "area-infra"
    create_issue_if_missing "wed" "Lock submission narrative + judging-axis mapping"    "$BODY_TEMPLATE" "area-docs"
    create_issue_if_missing "thu" "Implement audit-bundle export (AC-7.2.*)"            "$BODY_TEMPLATE" "area-api,area-pdf-engine"
    create_issue_if_missing "thu" "Polish UI: PT-BR copy review + a11y pass (AC-8.2.1)" "$BODY_TEMPLATE" "area-web,area-ui"
    create_issue_if_missing "thu" "Deploy mainnet — multi-sig signs program upgrade"    "$BODY_TEMPLATE" "area-programs-yoursign,needs-security-analyst"
    create_issue_if_missing "thu" "Record demo video (≤2 min)"                          "$BODY_TEMPLATE" "area-docs"
    create_issue_if_missing "fri" "Submit to Colosseum portal"                          "$BODY_TEMPLATE" "area-docs"
    create_issue_if_missing "fri" "Founder monitors: signups, on-chain attestations, support DMs" "$BODY_TEMPLATE" "area-docs"
    create_issue_if_missing "fri" "Sprint 4 retro + final gate"                         "$BODY_TEMPLATE" "area-docs"
    ;;
  *)
    warn "Sprint $SPRINT_NUM seed template not yet defined."
    warn "Add a case branch in scripts/seed-sprint-issues.sh after planning Sprint $SPRINT_NUM."
    exit 0
    ;;
esac

ok "Sprint $SPRINT_NUM issues seeded on $REPO"
echo
echo "Next:"
echo "  gh issue list --repo $REPO --state open --label sprint-$SPRINT_NUM"
echo "  ./scripts/autonomous-loop.sh ralph"
