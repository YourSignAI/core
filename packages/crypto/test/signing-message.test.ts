import { describe, expect, it } from 'vitest';
import { canonicalSigningMessage, sign, verify, hash256 } from '../src/index.js';
import * as ed from '@noble/ed25519';

describe('canonical signing message', () => {
  it('matches AC-4.1.1 byte layout', () => {
    const m = canonicalSigningMessage({
      filename: 'invoice.pdf',
      hashHex: 'a'.repeat(64),
      signerB58: 'AaAa1111111111111111111111111111111111111111',
      timestampIso: '2026-06-07T12:00:00Z',
      workspaceId: 'ws-001',
      nonceHex: 'b'.repeat(64),
    });
    expect(m).toBe(
      'YourSign v1\n' +
      'Document: invoice.pdf\n' +
      `Hash (SHA-256): ${'a'.repeat(64)}\n` +
      'Signer: AaAa1111111111111111111111111111111111111111\n' +
      'Timestamp (UTC): 2026-06-07T12:00:00Z\n' +
      'Workspace: ws-001\n' +
      `Nonce: ${'b'.repeat(64)}\n`,
    );
  });

  it('rejects malformed hash', () => {
    expect(() =>
      canonicalSigningMessage({
        filename: 'x.pdf',
        hashHex: 'NOTHEX',
        signerB58: 'P',
        timestampIso: '2026-06-07T12:00:00Z',
        workspaceId: 'w',
        nonceHex: 'c'.repeat(64),
      }),
    ).toThrow();
  });
});

describe('ed25519 sign/verify roundtrip', () => {
  it('verifies a signature it produced', async () => {
    const secret = ed.utils.randomPrivateKey();
    const pub = await ed.getPublicKeyAsync(secret);
    const h = hash256('hello world');
    const sig = await sign(h, secret);
    expect(await verify(h, sig, pub)).toBe(true);
  });

  it('rejects a tampered signature', async () => {
    const secret = ed.utils.randomPrivateKey();
    const pub = await ed.getPublicKeyAsync(secret);
    const h = hash256('hello');
    const sig = await sign(h, secret);
    sig[0] ^= 1;
    expect(await verify(h, sig, pub)).toBe(false);
  });
});
