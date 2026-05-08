#!/usr/bin/env bash
# autonomous-loop.sh — Ralph-style continuous loop for YourSign.
#
# Drives Claude Code through sprints autonomously: pick gh issue → execute →
# update workpad → commit → PR → close → next.
#
# Modes:
#   ralph       - default; loops issues for the active sprint until done
#   sprint-day  - run a single iteration
#   ship        - run smoke tests + deploy to prod (gated by env)
#
# Safety:
#   - YOURSIGN_LOOP_ALLOW_PROD=1 required to deploy prod
#   - never rotates secrets autonomously
#   - halts on any unhandled exit; state in .loop-state/
#
# Requires:
#   - 'claude' CLI on PATH
#   - 'gh' CLI authenticated (gh auth status)
#   - executable scripts in scripts/
#
# Inspired by:
#   - Ghuntley Ralph loop  https://ghuntley.com/ralph/
#   - genai-mkt-engine     /Users/leandrobarbosa/Personal/mkt-company-startup/genai-mkt-engine/scripts/autonomous-loop.sh
#   - Claude Code /loop + CronCreate session-scoped scheduler

set -euo pipefail

MODE="${1:-ralph}"
YOURSIGN_ROOT="${YOURSIGN_ROOT:-$(pwd)}"
STATE_DIR="$YOURSIGN_ROOT/.loop-state"
LOG_DIR="$STATE_DIR/logs"
mkdir -p "$STATE_DIR" "$LOG_DIR"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { printf "[%s] %s\n" "$(ts)" "$*" | tee -a "$LOG_DIR/loop.log" >&2; }

# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------
MAX_ITERATIONS="${YOURSIGN_LOOP_MAX_ITER:-200}"
ITER_TIMEOUT_S="${YOURSIGN_LOOP_ITER_TIMEOUT:-3600}"
SLEEP_BETWEEN_ITER_S="${YOURSIGN_LOOP_SLEEP:-30}"
ALLOW_PROD="${YOURSIGN_LOOP_ALLOW_PROD:-0}"

REPO="${YOURSIGN_REPO:-YourSignAI/core}"
DEFAULT_SPRINT="$YOURSIGN_ROOT/docs/05-sprints/SPRINT-0.md"
ACTIVE_SPRINT_VAR_FILE="$STATE_DIR/active_sprint.txt"
[ -f "$ACTIVE_SPRINT_VAR_FILE" ] || echo "$DEFAULT_SPRINT" > "$ACTIVE_SPRINT_VAR_FILE"

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
exit_signal() {
  log "halting: $*"
  exit "${2:-1}"
}

iteration_prompt() {
  local active_sprint sprint_num
  active_sprint="$(cat "$ACTIVE_SPRINT_VAR_FILE")"
  sprint_num="$(echo "$active_sprint" | grep -oE 'SPRINT-[0-9]+' | grep -oE '[0-9]+' || echo '0')"
  cat <<PROMPT
You are Claude Code operating the YourSign Symphony Harness autonomously.

Standing manual:    $YOURSIGN_ROOT/CLAUDE.md
System spec:        $YOURSIGN_ROOT/docs/01-spec.md
Architecture:       $YOURSIGN_ROOT/docs/02-architecture.md
Symphony Harness:   $YOURSIGN_ROOT/docs/03-symphony-harness.md
Active sprint plan: $active_sprint
Operating loop:     $YOURSIGN_ROOT/CLAUDE.md §"Agent Operating Loop"

GitHub tracker: $REPO
Active sprint label: sprint-$sprint_num

CURRENT TASK:
0. (codemem warm-up — recall optimization, not authoritative)
   - mcp__codemem__search_memory(project="yoursign-core", query=<the next issue's title or theme>)
   - Use returned memories as context.
1. Run: gh issue list --repo $REPO --state open --label sprint-$sprint_num,in-progress
   - If any: resume the highest-priority one. Read its body + ## Symphony Workpad comment.
2. Else run: gh issue list --repo $REPO --state open --label sprint-$sprint_num,todo --limit 5
   - Pick highest-priority issue whose day-* label matches the current sprint day (per git history).
   - gh issue edit <id> --add-label in-progress --remove-label todo --repo $REPO
3. Execute the issue per CLAUDE.md §"Agent Operating Loop":
   - Build TaskList via TaskCreate.
   - Read referenced spec ACs, ADRs, contracts.
   - Code small, test as you go, commit with spec citation in message.
   - Update the issue's ## Symphony Workpad comment as you progress.
4. When the issue is complete: open PR linked via 'Closes #<id>'. After merge, label moves to 'done'.
5. (codemem capture) If you discovered a non-obvious gotcha, ADR-worthy decision, or sprint learning:
   mcp__codemem__add_memory(project="yoursign-core", content=<one-paragraph prose>)
   Skip if no new insight.
6. If all issues for the current sprint+day are done: validate against the day's sprint criterion and emit
   SPRINT_DAY_COMPLETE. If Friday and all gates pass: SPRINT_COMPLETE.

CONSTRAINTS:
- Do not deploy to production unless explicitly authorized for this iteration.
- Do not rotate secrets.
- Do not edit files in vendor/ (when present).
- Do not bypass human-in-the-loop approval gates.
- Mark each TodoWrite task as completed only when verified.
- If a sprint Friday gate fails: write an ADR (docs/adr/NNNN-sprint-${sprint_num}-replan.md) and halt.
- If you complete the day, advance to next day; if you complete the sprint, advance the active sprint pointer.
- Sensitive paths (packages/crypto, programs/yoursign, apps/api/src/auth, apps/api/src/routes/payments)
  REQUIRE Architect role + Security Analyst sign-off (delegate to Gemini 2.5 Pro via mcp__gemini__gemini).

ITERATION OUTPUT (last line of your response, exactly):
LOOP_STATUS: <one of: CONTINUE | SPRINT_DAY_COMPLETE | SPRINT_COMPLETE | LAUNCH_READY | BLOCKED:reason | ERROR:reason>
PROMPT
}

run_one_iteration() {
  local iter="$1"
  local iter_log="$LOG_DIR/iter-$(printf '%04d' "$iter").log"

  log "iteration $iter starting (logfile: $iter_log)"

  if ! timeout "$ITER_TIMEOUT_S" claude --print --dangerously-skip-permissions \
      < <(iteration_prompt) > "$iter_log" 2>&1; then
    log "iteration $iter timed out or errored (exit $?)"
    return 1
  fi

  local status
  status="$(grep -E '^LOOP_STATUS:' "$iter_log" | tail -1 | sed 's/^LOOP_STATUS: *//')"
  echo "$status"
}

advance_sprint_if_complete() {
  local active_sprint
  active_sprint="$(cat "$ACTIVE_SPRINT_VAR_FILE")"
  case "$active_sprint" in
    *SPRINT-0.md) echo "$YOURSIGN_ROOT/docs/05-sprints/SPRINT-1.md" > "$ACTIVE_SPRINT_VAR_FILE" ;;
    *SPRINT-1.md) echo "$YOURSIGN_ROOT/docs/05-sprints/SPRINT-2.md" > "$ACTIVE_SPRINT_VAR_FILE" ;;
    *SPRINT-2.md) echo "$YOURSIGN_ROOT/docs/05-sprints/SPRINT-3.md" > "$ACTIVE_SPRINT_VAR_FILE" ;;
    *SPRINT-3.md) echo "$YOURSIGN_ROOT/docs/05-sprints/SPRINT-4.md" > "$ACTIVE_SPRINT_VAR_FILE" ;;
    *SPRINT-4.md) echo "LAUNCH_READY" > "$ACTIVE_SPRINT_VAR_FILE" ;;
  esac
  log "active sprint advanced to: $(cat "$ACTIVE_SPRINT_VAR_FILE")"
}

# -----------------------------------------------------------------------------
# Modes
# -----------------------------------------------------------------------------

mode_ralph() {
  log "starting ralph loop (max_iter=$MAX_ITERATIONS, timeout=${ITER_TIMEOUT_S}s, repo=$REPO)"
  echo $$ > "$STATE_DIR/ralph.pid"
  trap 'rm -f "$STATE_DIR/ralph.pid"' EXIT

  local iter=0
  while [ "$iter" -lt "$MAX_ITERATIONS" ]; do
    iter=$((iter+1))
    local status
    status="$(run_one_iteration "$iter" || echo 'ERROR:iteration_failed')"
    log "iteration $iter status: $status"

    case "$status" in
      CONTINUE)
        sleep "$SLEEP_BETWEEN_ITER_S"
        ;;
      SPRINT_DAY_COMPLETE)
        log "sprint day complete; agent advances day next iteration"
        sleep "$SLEEP_BETWEEN_ITER_S"
        ;;
      SPRINT_COMPLETE)
        advance_sprint_if_complete
        sleep "$SLEEP_BETWEEN_ITER_S"
        ;;
      LAUNCH_READY)
        log "all sprints complete — ready for ship mode"
        if [ "$ALLOW_PROD" = "1" ]; then
          mode_ship
          exit_signal "ship completed" 0
        else
          exit_signal "launch ready; set YOURSIGN_LOOP_ALLOW_PROD=1 and re-run with mode=ship to deploy" 0
        fi
        ;;
      BLOCKED:*)
        exit_signal "blocked: ${status#BLOCKED:}" 2
        ;;
      ERROR:*|"")
        log "iteration $iter error: $status; retrying after backoff"
        sleep $((SLEEP_BETWEEN_ITER_S * 2))
        ;;
      *)
        exit_signal "unknown status: $status" 3
        ;;
    esac
  done
  exit_signal "max iterations ($MAX_ITERATIONS) reached" 4
}

mode_sprint_day() {
  log "executing single sprint day"
  local status
  status="$(run_one_iteration 1 || echo 'ERROR:iteration_failed')"
  log "result: $status"
}

mode_ship() {
  log "ship mode: validating + deploying"

  log "running smoke tests against staging"
  if ! ./scripts/smoke-test.sh staging; then
    exit_signal "staging smoke failed; aborting ship" 5
  fi

  if [ "$ALLOW_PROD" != "1" ]; then
    exit_signal "YOURSIGN_LOOP_ALLOW_PROD=1 required to deploy prod" 6
  fi

  log "deploying all apps to prod (parallel)"
  pnpm deploy:prod 2>&1 | tee "$LOG_DIR/deploy-prod.log"

  log "running smoke against prod"
  if ! ./scripts/smoke-test.sh prod; then
    log "prod smoke failed — initiating rollback"
    pnpm rollback:prod || true
    exit_signal "deploy aborted, rolled back" 7
  fi

  log "prod deploy successful"
}

# -----------------------------------------------------------------------------
# Dispatch
# -----------------------------------------------------------------------------
case "$MODE" in
  ralph) mode_ralph ;;
  sprint-day) mode_sprint_day ;;
  ship) mode_ship ;;
  *) echo "unknown mode: $MODE (use: ralph | sprint-day | ship)" >&2; exit 1 ;;
esac
