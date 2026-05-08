import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../env.js';
import { issueChallenge, verifyChallenge } from '../auth/siws.js';
import { issueSession } from '../auth/session.js';

const PubkeyB58 = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.post('/challenge', async (c) => {
  const body = (await c.req.json()) as unknown;
  const { address } = z.object({ address: PubkeyB58 }).parse(body);
  const out = await issueChallenge(c.env, address);
  return c.json(out);
});

authRoutes.post('/verify', async (c) => {
  const body = (await c.req.json()) as unknown;
  const { message, signature, pubkey } = z
    .object({ message: z.string(), signature: z.string(), pubkey: PubkeyB58 })
    .parse(body);
  const r = await verifyChallenge(c.env, message, signature, pubkey);
  if (!r.ok) return c.json({ error: r.reason }, 401);
  if (!c.env.SIWS_JWT_SECRET) return c.json({ error: 'server misconfigured' }, 500);
  const session = await issueSession(c.env.SIWS_JWT_SECRET, pubkey);
  // Set cookie + return token (web app prefers cookie; mcp/cli prefer header).
  c.header(
    'Set-Cookie',
    `yoursign-session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${24 * 3600}`,
  );
  return c.json({ session });
});
