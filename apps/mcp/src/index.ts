// YourSign MCP server (Cloudflare Worker + Hono).
// Exposes 4 MCP tools (delegate, sign_document, verify, revoke) per spec §10.4.
//
// Transport: HTTP+SSE per the @modelcontextprotocol/sdk spec. Production wiring
// of the SDK Server primitive lands in Sprint 3 Thursday once we lock the
// streaming transport for the demo. This stub keeps the surface stable and
// already speaks the right JSON shapes so `apps/web` and `apps/api` can call
// the tools directly while we finish the MCP transport layer.

import { Hono } from 'hono';
import type { Env } from './env.js';
import { delegate, DelegateInput } from './tools/delegate.js';
import { signDocument, SignDocumentInput } from './tools/sign-document.js';
import { verify, VerifyInput } from './tools/verify.js';
import { revoke, RevokeInput } from './tools/revoke.js';

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) =>
  c.json({
    name: 'yoursign-mcp',
    version: '0.1.0',
    spec: 'docs/01-spec.md §10',
    tools: ['delegate', 'sign_document', 'verify', 'revoke'],
  }),
);

app.get('/healthz', (c) => c.text('ok'));

app.post('/tools/delegate', async (c) => {
  const body = await c.req.json();
  const out = await delegate(c.env, DelegateInput.parse(body));
  return c.json(out);
});

app.post('/tools/sign_document', async (c) => {
  const body = await c.req.json();
  const out = await signDocument(c.env, SignDocumentInput.parse(body));
  return c.json(out);
});

app.post('/tools/verify', async (c) => {
  const body = await c.req.json();
  const out = await verify(c.env, VerifyInput.parse(body));
  return c.json(out);
});

app.post('/tools/revoke', async (c) => {
  const body = await c.req.json();
  const out = await revoke(c.env, RevokeInput.parse(body));
  return c.json(out);
});

// MCP discovery manifest — Claude Desktop reads this to register the tool set.
app.get('/.well-known/mcp.json', (c) =>
  c.json({
    name: 'yoursign',
    description: 'On-chain agent delegation + signing for the YourSign protocol.',
    version: '0.1.0',
    transport: { type: 'http', endpoint: '/mcp' },
    tools: [
      {
        name: 'delegate',
        description: 'Generate a wallet deep-link for the principal to grant scoped, time-boxed authority to an agent.',
        inputSchema: { type: 'object' },
      },
      {
        name: 'sign_document',
        description: 'Have the agent attest a document signature on-chain under an active delegation.',
        inputSchema: { type: 'object' },
      },
      {
        name: 'verify',
        description: 'Resolve a document hash on-chain and return the proof bundle.',
        inputSchema: { type: 'object' },
      },
      {
        name: 'revoke',
        description: 'Generate a wallet deep-link for the principal to revoke an active delegation.',
        inputSchema: { type: 'object' },
      },
    ],
  }),
);

export default app;
