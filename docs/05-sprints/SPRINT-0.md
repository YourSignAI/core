# Sprint 0 — Bootstrap

**Goal**: Repo, harness, CI, and stub apps live. A new contributor can `pnpm install && pnpm dev` and see all apps run.

**Methodology**: Google Design Sprint (Understand → Diverge → Decide → Prototype → Validate)

**Duration**: 4–5 days (kickoff sprint)

**Validation gate (Friday)**: `pnpm install && pnpm typecheck && pnpm lint && pnpm dev` all succeed locally; `anchor build` succeeds; CI green on a no-op PR.

---

## Monday — Understand

**Phase**: Discovery + tooling alignment.

**Activities**:

- Verify Node 24, pnpm 9.x, Solana CLI 2.x, Anchor latest stable, Rust 1.79+ all installed (`scripts/bootstrap.sh`).
- Read `docs/00-vision.md` → `docs/01-spec.md` → `docs/02-architecture.md` end-to-end.
- Confirm prototype mapping in `apps/web/README.md` and `packages/ui/README.md`.
- Stand up Vercel/Cloudflare projects (decision pending — see ADR-0001 + Cloudflare-vs-Vercel discussion).

**Artifacts**:
- `pnpm-lock.yaml` committed
- `.loop-state/` initialized

**Validation**: `scripts/bootstrap.sh` exits 0.

---

## Tuesday — Diverge

**Phase**: Stub the four apps.

**Activities**:

- Skeleton `apps/web` (Next.js 16 App Router, single landing route, no business logic).
- Skeleton `apps/api` (Fastify, only `/healthz`).
- Skeleton `apps/worker` (Node script that connects to a queue and exits cleanly when no jobs).
- Skeleton `apps/verifier` (Next.js 16 minimal, single route reading `?id=`).

**Validation**: `pnpm dev` brings all four up on distinct ports without errors.

---

## Wednesday — Decide

**Phase**: Lock conventions.

**Activities**:

- Lock package boundaries (each app + each package has `package.json`, `tsconfig.json`).
- Lock `@yoursign/config` exports.
- Lock contract conformance script signature (`scripts/verify-contract-conformance.ts`).
- Anchor program scaffold builds.

**Decisions**:
- Spec citation regex (see `harness/verifiers/spec-citation.md`).
- Branch / commit conventions (see `CLAUDE.md`).

**Validation**: `pnpm typecheck` and `anchor build` both green.

---

## Thursday — Prototype

**Phase**: Ship the harness.

**Activities**:

- Symphony Harness prompts and verifiers committed under `harness/`.
- GitHub Actions: `ci.yml`, `anchor.yml`, `verifier.yml` running on every PR.
- Issue templates + PR template wired.
- `scripts/seed-sprint-issues.sh 0` runs and creates labels + issues.

**Validation**: A test PR runs the verifier workflows and they pass on a no-op change.

---

## Friday — Validate

**Phase**: Sprint 0 gate.

**Activities**:

- Open a "hello world" PR. Verifier blocks if no spec citation.
- Add citation; verifier passes; merge.
- Run `./scripts/autonomous-loop.sh sprint-day` for one iteration; confirm Ralph picks an issue + transitions labels.

**Friday gate**:
- ✅ All four stub apps boot
- ✅ `anchor build` succeeds
- ✅ Symphony verifiers operational
- ✅ Ralph loop transitions an issue from `todo` → `in-progress` → PR → merged → `done`

If any fails: write `docs/adr/0007-sprint-0-replan.md` and roll into Monday of Sprint 1.

## Out of scope (this sprint)

- Real PDF processing (Sprint 1).
- Wallet integration (Sprint 1).
- Encryption (Sprint 2).
- Anchoring (Sprint 2).
- USDC payments (Sprint 3).
