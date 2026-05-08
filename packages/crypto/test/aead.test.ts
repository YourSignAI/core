import { describe, expect, it } from 'vitest';
import { generateDek, seal, open, wrapDek, unwrapDek } from '../src/index.js';
import { x25519 } from '@noble/curves/ed25519';

describe('aead', () => {
  it('seal/open roundtrip', () => {
    const dek = generateDek();
    const pt = new TextEncoder().encode('top-secret payload');
    const sealed = seal(pt, dek);
    const out = open(sealed, dek);
    expect(new TextDecoder().decode(out)).toBe('top-secret payload');
  });

  it('open with wrong DEK fails', () => {
    const dek = generateDek();
    const wrong = generateDek();
    const sealed = seal(new TextEncoder().encode('x'), dek);
    expect(() => open(sealed, wrong)).toThrow();
  });
});

describe('wrap/unwrap', () => {
  it('roundtrips a DEK to a recipient', () => {
    const dek = generateDek();
    const recipientSk = x25519.utils.randomPrivateKey();
    const recipientPk = x25519.getPublicKey(recipientSk);
    const wrapped = wrapDek(dek, recipientPk);
    const out = unwrapDek(wrapped, recipientSk);
    expect(out).toEqual(dek);
  });
});
