// AC-3.1.2 — DEK wrap/unwrap via X25519 key agreement. Domain separation tag
// "yoursign-x25519-v1" prevents cross-protocol replay.
//
// Solana wallets are Ed25519. We derive an X25519 keypair per recipient via
// the standard `crypto_sign_ed25519_pk_to_curve25519` mapping (libsodium
// semantics). The recipient's wallet exposes a `signMessage`-style flow; the
// X25519 secret is derived client-side from the recipient's `keypair.secretKey`
// (32 bytes) — never persisted server-side.

import { x25519 } from '@noble/curves/ed25519';
import { gcm } from '@noble/ciphers/aes';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

const DOMAIN_TAG = new TextEncoder().encode('yoursign-x25519-v1');

export type WrappedKey = {
  ephPub: Uint8Array;       // 32B
  iv: Uint8Array;           // 12B
  ciphertext: Uint8Array;   // wrapped DEK (32B + 16B tag = 48B)
};

export function wrapDek(dek: Uint8Array, recipientX25519Pub: Uint8Array): WrappedKey {
  if (dek.length !== 32) throw new Error('DEK must be 32 bytes');
  if (recipientX25519Pub.length !== 32) throw new Error('recipient pub must be 32 bytes');
  const ephSecret = x25519.utils.randomPrivateKey();
  const ephPub = x25519.getPublicKey(ephSecret);
  const shared = x25519.getSharedSecret(ephSecret, recipientX25519Pub);
  const kek = hkdf(sha256, shared, DOMAIN_TAG, ephPub, 32);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ciphertext = gcm(kek, iv).encrypt(dek);
  return { ephPub, iv, ciphertext };
}

export function unwrapDek(wrapped: WrappedKey, recipientX25519Secret: Uint8Array): Uint8Array {
  const shared = x25519.getSharedSecret(recipientX25519Secret, wrapped.ephPub);
  const kek = hkdf(sha256, shared, DOMAIN_TAG, wrapped.ephPub, 32);
  return gcm(kek, wrapped.iv).decrypt(wrapped.ciphertext);
}
