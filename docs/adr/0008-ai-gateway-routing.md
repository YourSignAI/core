# ADR-0008 — AI Gateway routing: Cloudflare AI Gateway → Anthropic primary, Workers AI fallback

- Status: **Accepted** (2026-05-08)
- Deciders: founding team
- Tags: ai, gateway, observability, cost
- Related: ADR-0007 (agent identity), spec §10

## Context

Agentic flows in YourSign (MCP tool calls, scope summarization for the principal, decline-reason classifier, audit narrative generator) all need an LLM. Calling provider SDKs directly from `apps/mcp`, `apps/api`, or `apps/worker` means:

- N copies of API keys leaking into N envs.
- No unified rate limit.
- No request log we can replay for the audit appendix.
- No fallback when Anthropic is degraded.
- Per-call billing with no central cap.

Cloudflare AI Gateway sits in front of every LLM call, gives us:

- One ingress, many providers (Anthropic, OpenAI, Workers AI, Replicate).
- Request/response logs (queryable, exportable to R2).
- Caching (semantic + exact) with TTL knobs.
- Per-key spend cap + alerting.
- Real-time provider health → automatic provider fallback.

We are 100% Cloudflare for runtime infra (Pages + Workers + DO + Hyperdrive + R2 + Queues + Workflows). AI Gateway extends that posture without a new vendor.

## Options considered

1. **Cloudflare AI Gateway with Anthropic primary, Workers AI fallback (this ADR).**
2. **Direct Anthropic SDK in each app.** No central observability, no fallback, key sprawl. Rejected.
3. **OpenRouter / Vercel AI Gateway.** Vendor outside Cloudflare; adds egress cost and a second ops surface. Rejected.
4. **LiteLLM proxy on Workers.** Self-hosted. We'd own uptime, retries, fallback. Rejected (4-day budget).
5. **Workers AI exclusively.** Cheapest path but quality gap on tool calling vs. Claude Sonnet/Opus. Use it as fallback only.

## Decision

- **Single ingress:** every agent / app calls `https://gateway.ai.cloudflare.com/v1/{account}/yoursign/{provider}/v1/...`.
- **Primary provider:** Anthropic (`anthropic/claude-sonnet-4-6` for tool-use; `anthropic/claude-haiku-4-5` for cheap classifiers).
- **Fallback provider:** Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) on Anthropic 5xx, rate limit, or > 8s latency.
- **Routing rules** declared in `apps/api/src/ai/gateway.ts` (typed, versioned). No per-call provider override unless a feature flag sets it.
- **Spend cap:** $50/day in hackathon mode, alarms at 80%. Enforced via gateway dashboard + duplicated as a Worker KV counter for hard-stop in code.
- **Caching:** semantic cache off for tool-use calls (correctness > cost); exact cache on for the audit-narrative generator (key = canonical doc hash + agent_action_id).
- **Logging:** every prompt + completion logged with `(workspace_id, agent_pubkey, tool_id, doc_id_hash)` metadata. R2 retention 90d. PII redaction applied at the Worker before forwarding (see §Privacy).

## Why

- **Single rotation point.** Rotate one secret (`CF_AI_GATEWAY_TOKEN`), every app rotates.
- **Audit narrative.** AC-7.2.* requires reproducible audit bundles; gateway logs give us the raw LLM transcript per agent action — pinned to the on-chain `AgentAction` via metadata.
- **Failover.** Anthropic's status page is excellent but not 100%. Llama 3.3 70B fp8 on Workers AI handles tool calls acceptably for the demo flows we ship.
- **Cost control.** A runaway agent loop can't drain the treasury — gateway cap hits before our wallet does.
- **No new vendor.** Cloudflare-only thesis stays clean for Colosseum judging.

## Why NOT the alternatives

- **Direct SDK.** No observability, no fallback, key sprawl. Hackathon-fragile.
- **Vercel AI Gateway.** Mixes infra vendors; adds egress cost.
- **OpenRouter.** Quality and observability are good but sits outside Cloudflare's network — extra hop, extra invoice.
- **LiteLLM.** Self-hosted ops surface we don't have time for.
- **Workers AI only.** Tool-calling quality gap is real; demo flow needs Claude.

## Privacy

PII redaction runs **before** the Worker forwards to AI Gateway:

- Email addresses → `<email>`.
- Phone numbers → `<phone>`.
- CPF/CNPJ → `<doc-id>`.
- Document plaintext → never. The gateway only ever sees `document_hash` + scope JSON (already public-by-design).

Redaction implemented in `apps/api/src/ai/redact.ts`, KAT-tested against Brazilian PII patterns.

## Consequences

- **Secrets:** `CF_AI_GATEWAY_TOKEN` (Cloudflare), `ANTHROPIC_API_KEY` (Anthropic). Stored only via `wrangler secret`.
- **Observability:** logs queryable from Cloudflare dashboard; export job to R2 wired up in Sprint 4.
- **Workers AI:** `@cf/meta/llama-3.3-70b-instruct-fp8-fast` binding required in `apps/api/wrangler.toml` and `apps/mcp/wrangler.toml`.
- **Local dev:** `wrangler dev` proxies through real gateway (cheap haiku model + lower cap) — no mocks. Devs use `.dev.vars` for local-only token.
- **No model name in prompts.** Model selection lives in `apps/api/src/ai/gateway.ts`; consumers pass `task: 'tool-use' | 'classify' | 'narrative'`.

## Reversal cost

**Low.** Swap base URL to Anthropic direct; lose observability/fallback. ~1 day to restore equivalent guarantees on a different gateway.

## Security review hooks

- `apps/api/src/ai/**` — Security Analyst delegation required.
- PII redaction unit tests must pass before each merge touching redaction code.
- Spend cap KV counter is mandatory; verifier `harness/verifiers/no-runaway-llm.md` (TBD) blocks merges that disable it.
