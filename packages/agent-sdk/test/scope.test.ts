import { describe, expect, it } from 'vitest';
import { canonicalScopeJson, hashScope } from '../src/scope.js';

describe('scope canonicalization', () => {
  it('reorders keys + tools deterministically', () => {
    const a = canonicalScopeJson({
      tools: ['verify', 'sign_document'],
      documents: 'any',
      spendCapMicroUsdc: 0,
      expiresAt: '2026-06-07T12:00:00Z',
    });
    const b = canonicalScopeJson({
      // different input key order, different tool order — must produce same bytes
      // (key order in JSON.stringify follows the object literal we build, so
      // test both orderings)
      expiresAt: '2026-06-07T12:00:00Z',
      spendCapMicroUsdc: 0,
      documents: 'any',
      tools: ['sign_document', 'verify'],
    });
    expect(a).toBe(b);
  });

  it('hashScope is 32 bytes', () => {
    const h = hashScope({
      tools: ['sign_document'],
      documents: 'any',
      spendCapMicroUsdc: 0,
      expiresAt: '2026-06-07T12:00:00Z',
    });
    expect(h).toBeInstanceOf(Uint8Array);
    expect(h.length).toBe(32);
  });

  it('rejects bad ISO date', () => {
    expect(() =>
      canonicalScopeJson({
        tools: ['sign_document'],
        documents: 'any',
        spendCapMicroUsdc: 0,
        expiresAt: 'tomorrow',
      } as never),
    ).toThrow();
  });

  it('hashes documents.hashes order-insensitively', () => {
    const a = canonicalScopeJson({
      tools: ['sign_document'],
      documents: { hashes: ['ff'.repeat(32), '11'.repeat(32)] },
      spendCapMicroUsdc: 0,
      expiresAt: '2026-06-07T12:00:00Z',
    });
    const b = canonicalScopeJson({
      tools: ['sign_document'],
      documents: { hashes: ['11'.repeat(32), 'ff'.repeat(32)] },
      spendCapMicroUsdc: 0,
      expiresAt: '2026-06-07T12:00:00Z',
    });
    expect(a).toBe(b);
  });
});
