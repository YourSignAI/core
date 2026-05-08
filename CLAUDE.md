# CLAUDE.md — repo-specific instructions for Claude Code

This file is loaded automatically into Claude Code's context when you open this repo. Read `AGENTS.md` for the cross-agent charter and `docs/03-symphony-harness.md` for the role architecture.

```yaml
sprint:
  cadence: google-design-sprint
  duration_days: 5
  current_sprint_pointer: docs/05-sprints/SPRINT-0.md
  sprint_label_format: "sprint-{N}"
tracker:
  github_repo: YourSignAI/core
  source_of_truth: GitHub Issues (live work) + docs/05-sprints/SPRINT-N.md (plan)
loop:
  driver: scripts/autonomous-loop.sh
  state_dir: .loop-state/
  iteration_status: LOOP_STATUS:[CONTINUE|SPRINT_DAY_COMPLETE|SPRINT_COMPLETE|LAUNCH_READY|BLOCKED:reason|ERROR:reason]
memory:
  mcp: codemem
  project_key: yoursign-core
```

This document follows the Symphony Harness pattern adapted for Claude Code with **GitHub Issues** (`YourSignAI/core`) as the live tracker. Sprint files (`docs/05-sprints/SPRINT-N.md`) are the source PLAN; gh issues are the live WORK derived from those plans.

- Read the active sprint file FOR PLANNING + read open gh issues for ACTIVE WORK at session start.
- Authoritative tracker: GitHub Issues. All work moves through issues.
- Never deviate from the sprint plan silently. Deviations require an ADR documenting why.

## Operating principles

- **Spec-driven.** Before editing, find the spec or contract that the change implements (`docs/01-spec.md`, `docs/contracts/*`, an ADR). If none exists, write the spec first.
- **No silent expansion.** A bug fix is a bug fix; don't refactor neighbors. Each commit cites a spec section.
- **PT-BR product, EN docs.** UI strings can be PT-BR; documentation, ADRs, contracts, and code identifiers are English.
- **Solana ecosystem first.** Anchor (Rust), `@solana/web3.js`, `@solana/spl-token`, `@solana/pay`, Light Protocol's `@lightprotocol/stateless.js`. Avoid generic blockchain libs.
- **Public-from-day-1.** Don't write things you wouldn't want a Colosseum judge or a recruiter to see. No private TODOs in committed files; use the gsd-todo skill or `harness/runs/`.

## Repo conventions

- **Package manager:** pnpm only.
- **Node:** 24 LTS (`.nvmrc`).
- **TypeScript:** strict, no implicit any, ESM.
- **Testing:** Vitest for unit, Playwright for web e2e, `solana-test-validator` + Anchor's `bankrun` for on-chain.
- **Commits:** Conventional Commits, scope = workspace name (`feat(web): …`, `fix(solana-sdk): …`).
- **Branches:** `feat/<scope>-<short>`, `fix/<scope>-<short>`, `chore/…`.
- **PR title:** must reference spec/ADR/contract.

## Things that are NOT in scope here

- Changing the monorepo to npm/yarn/bun. (See ADR-0001.)
- Replacing Solana with another chain. (See ADR-0002.)
- Adding a custom token. USDC is the only payment asset. (See ADR-0003.)
- Re-encrypting historical data with a different scheme. (See ADR-0004.)

## When you (Claude) are unsure

1. Search `docs/` first.
2. Search ADRs (`docs/adr/`).
3. If still unclear, propose an ADR draft instead of guessing.
4. Use the `gsd-discuss-phase` skill to surface ambiguity to a human.

## Skills you should know about

- `gsd-spec-phase` — write a falsifiable spec for a phase.
- `gsd-plan-phase` — break a spec into a plan with verification.
- `gsd-execute-phase` — implement a plan wave-by-wave.
- `gsd-code-review` + `gsd-code-review-fix` — verifier loop.
- `bp:execute-prp` — TDD-E2E for product features.
- `vercel-plugin:nextjs`, `vercel-plugin:ai-sdk`, `vercel-plugin:vercel-storage` — when working in `apps/web`.

## Don't

- Don't commit secrets. Use `wrangler secret` (Cloudflare), `vercel env` (Vercel), or `.env.local` (dev).
- Don't run destructive git ops (`reset --hard`, `push --force`) without asking.
- Don't introduce a new framework without an ADR.
- Don't ship UI in English-only — PT-BR strings are first-class.

---

## Agent Operating Loop

For every Claude Code session inside this repo:

```
0.  (codemem warm-up) mcp__codemem__search_memory(project="yoursign-core", query=<topic>)
1.  gh issue list --repo YourSignAI/core --state open --label sprint-{N},in-progress
    → if any: resume the highest-priority one. Read body + ## Symphony Workpad comment.
2.  Else: gh issue list --repo YourSignAI/core --state open --label sprint-{N},todo --limit 5
    → pick highest-priority issue whose day-* label matches the current sprint day.
    → gh issue edit <id> --add-label in-progress --remove-label todo --repo YourSignAI/core
3.  Read referenced spec section + relevant ADRs + contracts cited in the issue body.
4.  Build a TaskList for this issue using TaskCreate.
5.  For each task:
    a. Mark in_progress before starting.
    b. Read the spec / runbook / contract for that task.
    c. Generate or modify code (small diffs, atomic commits).
    d. Run tests (`pnpm typecheck && pnpm test --filter <pkg>`).
    e. Commit with Conventional Commits message citing the spec:
         feat(scope): summary (spec:AC-X.Y.Z)
    f. Mark task completed.
6.  Update the issue's ## Symphony Workpad comment with the progress checklist.
7.  When the issue is complete: open PR linked via `Closes #<id>`. After merge, label moves to `done`.
8.  At end of day, validate the day's artifact against the sprint criterion in the sprint file.
9.  If a sprint Friday gate fails: write `docs/adr/NNNN-sprint-{N}-replan.md` and halt.
10. (codemem capture) Append non-obvious learnings:
       mcp__codemem__add_memory(project="yoursign-core", content=<one-paragraph prose>)
```

The sprint file is the **plan**; the issues are the **work**. They MUST stay in sync — adding work without an issue, or moving labels without progress, both break the harness.

### Hard escalations (delegate to Architect / Security Analyst)

Any change touching:
- `packages/crypto/**`
- `programs/yoursign/**`
- `apps/api/src/auth/**`
- `apps/api/src/routes/payments/**`
- `vercel.ts` / `wrangler.toml` / `wrangler.jsonc`
- `package.json` dep additions

… requires an ADR + a Security Analyst review (delegate via `mcp__gemini__gemini` per `~/.claude/rules/delegator/`).

The verifier (`harness/verifiers/adr-presence.md`) blocks the PR if no ADR is cited.

---

## Sprint Status Routing (via gh issues)

Issue labels are the authoritative state machine.

### Label convention

- `sprint-{N}` — sprint association (one per sprint)
- `day-{mon|tue|wed|thu|fri}` — sprint day association
- `phase-{understand|diverge|decide|prototype|validate}` — Google Design Sprint phase
- `area-{web|api|worker|verifier|core-domain|pdf-engine|solana-sdk|crypto|ui|schemas|config|programs-yoursign|harness|infra|docs|spec|adr|ci}` — code area
- Status (mutually exclusive): `todo`, `in-progress`, `blocked`, `rework`, `done`, `cancelled`
- Escalation: `needs-architect`, `needs-security-analyst`

### Routing table

| Current state | Action |
|---|---|
| `gh issue list --label sprint-{N},in-progress` returns one or more | Resume highest priority by reading the issue's `## Symphony Workpad` comment. |
| `in-progress` empty, `todo` non-empty for active sprint+day | Pick highest priority. Add `in-progress`, remove `todo`. Append `## Symphony Workpad` bootstrap comment. |
| All issues for current sprint+day are `done` | Validate the day's artifact against the sprint criterion. If pass, advance day; if Friday and gate fail, write ADR and replan. |
| Sprint Friday gate failed | Halt. Write `docs/adr/NNNN-sprint-{N}-replan.md`. Replan via new issues with `rework` label. |
| Sprint Friday gate passed | Run E2E suite. Advance to next sprint pointer. |
| Between sprints | Update `sprint.current_sprint_pointer` in this file's front matter. Run `./scripts/seed-sprint-issues.sh <next-sprint>` to bootstrap next sprint's issues. |

### Driving Ralph

```bash
# Bootstrap next sprint's issues from the markdown plan
./scripts/seed-sprint-issues.sh 0

# Run a single iteration manually
./scripts/autonomous-loop.sh sprint-day

# Run continuously until LAUNCH_READY (or BLOCKED)
./scripts/autonomous-loop.sh ralph

# Ship after LAUNCH_READY
YOURSIGN_LOOP_ALLOW_PROD=1 ./scripts/autonomous-loop.sh ship
```

State files (`.loop-state/`):
- `active_sprint.txt` — pointer to the current sprint markdown file
- `ralph.pid` — current Ralph process pid (cleaned on exit)
- `logs/iter-NNNN.log` — per-iteration Claude transcript (gitignored)

---

## Persistent Memory — codemem MCP

Each Claude Code iteration is stateless (`claude --print` spawns fresh). To bridge knowledge across iterations, use the **codemem** MCP server.

### Available tools

- `mcp__codemem__search_memory(query, project)` — semantic search past memories
- `mcp__codemem__add_memory(content, project)` — store a fact / decision / learning
- `mcp__codemem__list_memories(project)` — full list
- `mcp__codemem__get_project_context(project)` — current context summary
- `mcp__codemem__add_entity` / `add_relation` / `query_graph` — graph for entities (sagas, services, ADRs, sprints)

### When to use

- **Start of iteration**: `search_memory("yoursign-core", current_issue_summary)` to recall related decisions / pitfalls.
- **End of iteration**: `add_memory` with key learnings, gotchas, "X failed because Y", surprising findings.
- **ADR locked**: `add_memory` with one-line ADR summary so future iters surface it without re-reading.
- **Sprint Friday gate**: `add_memory` with sprint retrospective summary.

### What NOT to put in codemem

- Anything already canonical in `docs/` or git history. Single source of truth = the file. codemem is recall optimization.
- Sensitive values (private keys, mnemonics, tokens, customer data).
- Code snippets > 1KB. Keep memories prose, semantic.

### Project key

Always pass `project: "yoursign-core"`. Do not cross-pollinate with other repos.

---

## Conventional Commits

Every commit MUST follow Conventional Commits with sprint and (when applicable) issue ID:

```
<type>(<scope>): short imperative subject (spec:AC-X.Y.Z)

Closes #<issue-id>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`.
Scope: workspace name (`web`, `api`, `worker`, `verifier`, `core-domain`, `pdf-engine`, `solana-sdk`, `crypto`, `ui`, `schemas`, `programs-yoursign`).
