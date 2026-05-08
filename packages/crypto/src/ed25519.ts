// Ed25519 sign + verify. AC-2.3.1 (no key persistence) + AC-4.2.1 (signature
// over canonical message hash).
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { sha256 } from '@noble/hashes/sha256';

// noble/ed25519 v2 needs a sync sha512 hook for the sync API. The async path
// already has its own hook. Setting both keeps consumer choice open.
ed.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m));

export function hash256(s: string | Uint8Array): Uint8Array {
  const bytes = typeof s === 'string' ? new TextEncoder().encode(s) : s;
  return sha256(bytes);
}

export async function sign(messageHash: Uint8Array, secret: Uint8Array): Promise<Uint8Array> {
  if (secret.length !== 32) throw new Error('secret must be 32 bytes');
  return ed.signAsync(messageHash, secret);
}

export async function verify(
  messageHash: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): Promise<boolean> {
  if (signature.length !== 64) return false;
  if (publicKey.length !== 32) return false;
  return ed.verifyAsync(signature, messageHash, publicKey);
}
