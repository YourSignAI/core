// Thin wrappers over @noble/ed25519. Keep the surface tiny — Solana RPC + wallet
// adapters do the actual on-chain submission; this module just produces and
// verifies the canonical-message signatures named in ADR-0007.
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

// noble/ed25519 v2: sync API needs a sync sha512 hook. Async path is built-in.
ed.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m));

export async function signMessageHash(messageHash: Uint8Array, secretKey: Uint8Array): Promise<Uint8Array> {
  if (secretKey.length !== 32) throw new Error('agent secretKey must be 32 bytes');
  return ed.signAsync(messageHash, secretKey);
}

export async function verifyMessageHash(
  messageHash: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): Promise<boolean> {
  if (signature.length !== 64) return false;
  if (publicKey.length !== 32) return false;
  return ed.verifyAsync(signature, messageHash, publicKey);
}
