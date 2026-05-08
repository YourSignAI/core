import { describe, expect, it } from 'vitest';
import app from '../src/index.js';
import type { Env } from '../src/env.js';

const env = {
  SOLANA_CLUSTER: 'devnet',
  SOLANA_RPC_URL: 'https://api.devnet.solana.com',
  LIGHT_RPC_URL: 'https://devnet.helius-rpc.com',
  PROGRAM_ID: 'TEST',
  SCOPE_R2_BUCKET: 'test',
} as unknown as Env;

describe('mcp surface', () => {
  it('exposes 4 tools in the manifest', async () => {
    const res = await app.fetch(new Request('http://x/.well-known/mcp.json'), env);
    const body = await res.json() as { tools: { name: string }[] };
    const names = body.tools.map((t) => t.name).sort();
    expect(names).toEqual(['delegate', 'revoke', 'sign_document', 'verify']);
  });

  it('healthz returns ok', async () => {
    const res = await app.fetch(new Request('http://x/healthz'), env);
    expect(await res.text()).toBe('ok');
  });
});
