// AC-3.1.1 — AES-256-GCM document encryption. DEK is fresh per document;
// wrapping per recipient lives in `wrap.ts`. Plaintext NEVER hits the server
// (AC-3.2.1) so this module is consumed only in the browser / verifier.
import { gcm } from '@noble/ciphers/aes';
import { sha256 } from '@noble/hashes/sha256';

export type SealedDocument = {
  ciphertext: Uint8Array;
  iv: Uint8Array;
};

export function generateDek(): Uint8Array {
  const dek = new Uint8Array(32);
  crypto.getRandomValues(dek);
  return dek;
}

// Convergent DEK derivation from the canonical PDF hash. Used by the v0.1
// upload flow so R2 stores ciphertext only — the server is blind to plaintext.
// Anyone with the canonical hash (already public on-chain) can re-derive the
// DEK and decrypt; this is "encrypted at rest", not full zero-knowledge.
// v1.1 will replace this with per-recipient X25519 wraps so the canonical
// hash alone is no longer sufficient to decrypt.
const CONVERGENT_SALT = new TextEncoder().encode('yoursign-blob-v1');

export function deriveConvergentDek(canonicalHash: Uint8Array): Uint8Array {
  if (canonicalHash.length !== 32) throw new Error('canonical hash must be 32 bytes');
  const buf = new Uint8Array(canonicalHash.length + CONVERGENT_SALT.length);
  buf.set(canonicalHash, 0);
  buf.set(CONVERGENT_SALT, canonicalHash.length);
  return sha256(buf);
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
