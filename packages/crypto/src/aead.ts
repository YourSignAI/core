// AC-3.1.1 — AES-256-GCM document encryption. DEK is fresh per document;
// wrapping per recipient lives in `wrap.ts`. Plaintext NEVER hits the server
// (AC-3.2.1) so this module is consumed only in the browser / verifier.
import { gcm } from '@noble/ciphers/aes';

export type SealedDocument = {
  ciphertext: Uint8Array;
  iv: Uint8Array;
};

export function generateDek(): Uint8Array {
  const dek = new Uint8Array(32);
  crypto.getRandomValues(dek);
  return dek;
}

export function seal(plaintext: Uint8Array, dek: Uint8Array): SealedDocument {
  if (dek.length !== 32) throw new Error('DEK must be 32 bytes');
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ciphertext = gcm(dek, iv).encrypt(plaintext);
  return { ciphertext, iv };
}

export function open(sealed: SealedDocument, dek: Uint8Array): Uint8Array {
  if (dek.length !== 32) throw new Error('DEK must be 32 bytes');
  return gcm(dek, sealed.iv).decrypt(sealed.ciphertext);
}
