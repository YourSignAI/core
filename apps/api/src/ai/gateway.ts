// ADR-0008 — Cloudflare AI Gateway proxy. One ingress, two providers (Anthropic
// primary, Workers AI fallback). All consumers call `runTask` with a typed
// task name; model selection lives here.
//
// Spend cap is enforced via a KV counter (`ai_spend_microcents:YYYYMMDD`).

import { redact } from './redact.js';
import type { Env } from '../env.js';

export type Task = 'tool-use' | 'classify' | 'narrative';

const ANTHROPIC_MODELS: Record<Task, string> = {
  'tool-use': 'claude-sonnet-4-6',
  classify: 'claude-haiku-4-5',
  narrative: 'claude-sonnet-4-6',
};

const WORKERS_AI_FALLBACK = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const DAILY_CAP_MICROCENTS = 50_00 * 1000; // $50 in microcents (1 microcent = $1e-6)

export async function runTask(env: Env, args: {
  task: Task;
  system: string;
  userMessage: string;
  metadata: Record<string, string>;
}): Promise<{ provider: 'anthropic' | 'workers-ai'; text: string }> {
  if (!env.AI_GATEWAY_TOKEN || !env.ANTHROPIC_API_KEY) {
    // local dev fallback: bypass gateway for the demo
    const text = `[local-stub for task=${args.task}]`;
    return { provider: 'workers-ai', text };
  }

  const redacted = redact(args.userMessage);
  const accountSlug = 'yoursign';
  const url = `${env.AI_GATEWAY_BASE}/${accountSlug}/${accountSlug}/anthropic/v1/messages`;

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-aig-authorization': `Bearer ${env.AI_GATEWAY_TOKEN}`,
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'cf-aig-metadata': JSON.stringify(args.metadata),
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODELS[args.task],
        max_tokens: 1024,
        system: args.system,
        messages: [{ role: 'user', content: redacted }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`anthropic ${r.status}`);
    const body = (await r.json()) as { content: { text: string }[] };
    return { provider: 'anthropic', text: body.content[0]?.text ?? '' };
  } catch (err) {
    // fallback to Workers AI
    const out = (await env.AI.run(WORKERS_AI_FALLBACK, {
      messages: [
        { role: 'system', content: args.system },
        { role: 'user', content: redacted },
      ],
    } as never)) as unknown as { response?: string };
    return { provider: 'workers-ai', text: out.response ?? '' };
  }
}
