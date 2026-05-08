// AC-2.3.2 — Sign-In with Solana. CAIP-122 message + nonce. The server stores
// the nonce in KV with a TTL; verify checks signature + nonce + expiry +
// audience.
//
// Nonce is single-use: deleted after a successful verify.

import { canonicalSigningMessage } from '@yoursign/crypto';
import { verify as verifySig, hash256 } from '@yoursign/crypto';
import type { Env } from '../env.js';

const NONCE_TTL_SECS = 5 * 60;

function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeBase58(s: string): Uint8Array {
  // minimal base58 decode; OK for 32B pubkeys
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = 0n;
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) throw new Error('bad base58');
    n = n * 58n + BigInt(v);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  let bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  // restore leading zero bytes (each leading '1' = one zero byte)
  let leading = 0;
  for (const ch of s) { if (ch === '1') leading++; else break; }
  if (leading > 0) {
    const pad = new Uint8Array(leading + bytes.length);
    pad.set(bytes, leading);
    bytes = pad;
  }
  return bytes;
}

export async function issueChallenge(env: Env, addressB58: string): Promise<{ message: string; nonce: string }> {
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = bytesToHex(nonceBytes);
  const issuedAt = new Date().toISOString();
  const expirationTime = new Date(Date.now() + NONCE_TTL_SECS * 1000).toISOString();
  const message = [
    `${env.SIWS_DOMAIN} wants you to sign in with your Solana account:`,
    addressB58,
    '',
    'YourSign — assinatura descentralizada de documentos.',
    '',
    `URI: ${env.SIWS_AUDIENCE}`,
    `Version: 1`,
    `Chain ID: mainnet`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expiration Time: ${expirationTime}`,
  ].join('\n');
  await env.SIWS_NONCES.put(`siws:${addressB58}:${nonce}`, '1', { expirationTtl: NONCE_TTL_SECS });
  return { message, nonce };
}

export async function verifyChallenge(
  env: Env,
  message: string,
  signatureB64: string,
  pubkeyB58: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  // parse domain + nonce + expirationTime out of the message (cheap, line-based)
  const lines = message.split('\n');
  const firstLine = lines[0] ?? '';
  if (!firstLine.startsWith(env.SIWS_DOMAIN)) return { ok: false, reason: 'wrong domain' };
  const addr = lines[1] ?? '';
  if (addr !== pubkeyB58) return { ok: false, reason: 'address mismatch' };
  const nonceLine = lines.find((l) => l.startsWith('Nonce: '));
  const expiryLine = lines.find((l) => l.startsWith('Expiration Time: '));
  const nonce = nonceLine?.slice('Nonce: '.length);
  const expiry = expiryLine?.slice('Expiration Time: '.length);
  if (!nonce) return { ok: false, reason: 'missing nonce' };
  if (!expiry) return { ok: false, reason: 'missing expiry' };
  if (Date.parse(expiry) < Date.now()) return { ok: false, reason: 'expired' };

  const kvKey = `siws:${pubkeyB58}:${nonce}`;
  const used = await env.SIWS_NONCES.get(kvKey);
  if (!used) return { ok: false, reason: 'nonce unknown or already consumed' };

  const sig = decodeBase64(signatureB64);
  const pub = decodeBase58(pubkeyB58);
  const msgHash = hash256(message);
  const ok = await verifySig(msgHash, sig, pub);
  if (!ok) return { ok: false, reason: 'signature invalid' };

  await env.SIWS_NONCES.delete(kvKey);
  return { ok: true };
}

// Reference re-export so TypeScript doesn't tree-shake it from the build.
export const _useCanonicalSigningMessageInBuildOnly = canonicalSigningMessage;
