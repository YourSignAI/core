import { describe, expect, it } from 'vitest';
import { canonicalActionMessage, canonicalDelegationMessage, canonicalRevokeMessage } from '../src/messages.js';

describe('canonical agent messages', () => {
  it('delegation byte-string is stable and uses LF newlines', () => {
    const msg = canonicalDelegationMessage({
      principal: 'AaAa1111111111111111111111111111111111111111',
      agent: 'BbBb2222222222222222222222222222222222222222',
      tools: ['sign_document', 'verify'],
      documentsClause: 'any',
      spendCapMicroUsdc: 0,
      expiresAt: '2026-06-07T12:00:00Z',
      nonce: '00'.repeat(32),
    });
    expect(msg).not.toContain('\r');
    expect(msg).toMatchInlineSnapshot(`
"YourSign Agent Delegation v1
Principal: AaAa1111111111111111111111111111111111111111
Agent: BbBb2222222222222222222222222222222222222222
Scope:
  Tools: sign_document,verify
  Documents: any
  SpendCap (USDC, micro): 0
  Expires (UTC): 2026-06-07T12:00:00Z
Nonce: 0000000000000000000000000000000000000000000000000000000000000000
"
`);
  });

  it('tools sort is deterministic regardless of input order', () => {
    const a = canonicalDelegationMessage({
      principal: 'P', agent: 'A', tools: ['verify', 'sign_document'],
      documentsClause: 'any', spendCapMicroUsdc: 0, expiresAt: '2026-06-07T12:00:00Z', nonce: 'n',
    });
    const b = canonicalDelegationMessage({
      principal: 'P', agent: 'A', tools: ['sign_document', 'verify'],
      documentsClause: 'any', spendCapMicroUsdc: 0, expiresAt: '2026-06-07T12:00:00Z', nonce: 'n',
    });
    expect(a).toBe(b);
  });

  it('action message bytes are stable', () => {
    const m = canonicalActionMessage({
      delegationId: 'aa'.repeat(16),
      tool: 'sign_document',
      targetId: 'bb'.repeat(32),
      timestamp: '2026-06-07T12:34:56Z',
      nonce: 'cc'.repeat(32),
    });
    expect(m.startsWith('YourSign Agent Action v1\n')).toBe(true);
    expect(m.endsWith('\n')).toBe(true);
  });

  it('revoke message bytes are stable', () => {
    const m = canonicalRevokeMessage({ delegationId: 'aa'.repeat(16), nonce: 'bb'.repeat(32) });
    expect(m).toBe(
      'YourSign Agent Revoke v1\n' +
      `Delegation: ${'aa'.repeat(16)}\n` +
      `Nonce: ${'bb'.repeat(32)}\n`,
    );
  });
});
