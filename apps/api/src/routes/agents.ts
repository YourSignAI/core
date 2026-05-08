// Agent scope persistence + lookup. AC-10.1.4 — scope JSON is stored off-chain
// in R2 keyed by SHA-256(canonicalScopeJson). Verifier site re-hashes the JSON
// to confirm it matches the on-chain `scope_hash`.

import { Hono } from 'hono';
import { z } from 'zod';
import { hashScope, AgentScopeSchema, canonicalScopeJson } from '@yoursign/agent-sdk';
import type { Env } from '../env.js';

export const agentRoutes = new Hono<{ Bindings: Env }>();

function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

agentRoutes.post('/scope', async (c) => {
  const body = (await c.req.json()) as unknown;
  const { workspaceId, scope } = z
    .object({ workspaceId: z.string().min(1), scope: AgentScopeSchema })
    .parse(body);
  const scopeHashHex = bytesToHex(hashScope(scope));
  const canonical = canonicalScopeJson(scope);
  const existing = await c.env.SCOPES.head(scopeHashHex);
  if (!existing) {
    await c.env.SCOPES.put(scopeHashHex, canonical, {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: { workspaceId },
    });
  }
  return c.json({ scopeHashHex, scopeUri: `r2://${c.env.SCOPE_R2_BUCKET}/${scopeHashHex}` });
});

agentRoutes.get('/scope/:hash', async (c) => {
  const hash = c.req.param('hash');
  if (!/^[0-9a-f]{64}$/.test(hash)) return c.json({ error: 'bad hash' }, 400);
  const obj = await c.env.SCOPES.get(hash);
  if (!obj) return c.json({ error: 'not found' }, 404);
  const text = await obj.text();
  return new Response(text, { headers: { 'content-type': 'application/json' } });
});
