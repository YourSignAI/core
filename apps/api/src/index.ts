// YourSign API. Hono on Cloudflare Workers.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env.js';
import { authRoutes } from './routes/auth.js';
import { agentRoutes } from './routes/agents.js';
import { docRoutes } from './routes/documents.js';

const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: (origin) => origin ?? '*',
    credentials: true,
    allowHeaders: ['content-type', 'authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);

app.get('/', (c) =>
  c.json({
    name: 'yoursign-api',
    version: '0.1.0',
    docs: 'https://github.com/YourSignAI/core/blob/main/docs/contracts/api.md',
  }),
);

app.get('/healthz', (c) => c.text('ok'));

app.route('/auth', authRoutes);
app.route('/agents', agentRoutes);
app.route('/documents', docRoutes);

export default app;
