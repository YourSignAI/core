// Hand-encoded ix builders. Anchor discriminators + Borsh layouts.
// Avoids dependency on the generated IDL.

import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { PROGRAM_ID } from './constants.js';
import { documentPda, signatureAttestationPda } from './pda.js';

function discriminator(method: string): Uint8Array {
  return sha256(new TextEncoder().encode(`global:${method}`)).slice(0, 8);
}

function fixedBytes(b: Uint8Array, n: number): Uint8Array {
  if (b.length !== n) throw new Error(`expected ${n} bytes, got ${b.length}`);
  return b;
}

export type RegisterDocumentArgs = {
  documentId: Uint8Array;     // 16 bytes (ULID)
  canonicalHash: Uint8Array;  // 32 bytes
  workspaceId: Uint8Array;    // 16 bytes
  requiredSigners: number;    // u8
};

/**
 * Build a `register_document` instruction.
 *
 * Account layout (matches programs/yoursign/src/lib.rs `RegisterDocument`):
 *   0. registry           — PDA `[b"doc", document_id]` · writable, init
 *   1. owner              — signer, writable
 *   2. system_program
 */
export function registerDocumentIx(args: {
  owner: PublicKey;
  documentId: Uint8Array;
  canonicalHash: Uint8Array;
  workspaceId: Uint8Array;
  requiredSigners: number;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = args.programId ?? PROGRAM_ID;
  const documentId = fixedBytes(args.documentId, 16);
  const canonicalHash = fixedBytes(args.canonicalHash, 32);
  const workspaceId = fixedBytes(args.workspaceId, 16);

  const [registry] = documentPda(documentId);

  const data = new Uint8Array(8 + 16 + 32 + 16 + 1);
  data.set(discriminator('register_document'), 0);
  data.set(documentId, 8);
  data.set(canonicalHash, 8 + 16);
  data.set(workspaceId, 8 + 16 + 32);
  data[8 + 16 + 32 + 16] = args.requiredSigners & 0xff;

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: registry, isSigner: false, isWritable: true },
      { pubkey: args.owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

/**
 * AttestationKind enum (matches programs/yoursign/src/state.rs `AttestationKind`).
 * Borsh enum index — `Sign = 0`, `Decline = 1`, `NotaryCounterSign = 2`.
 */
export const AttestationKind = {
  Sign: 0,
  Decline: 1,
  NotaryCounterSign: 2,
} as const;
export type AttestationKindValue = typeof AttestationKind[keyof typeof AttestationKind];

export type AttestSignatureArgs = {
  documentId: Uint8Array;     // 16 bytes
  signature: Uint8Array;      // 64 bytes (ed25519 sig over the canonical signing msg, OR zeros for self-sign)
  messageHash: Uint8Array;    // 32 bytes (sha256 of the canonical signing msg)
  kind: AttestationKindValue;
};

/**
 * Build an `attest_signature` instruction.
 *
 * Account layout (matches programs/yoursign/src/lib.rs `AttestSignature`):
 *   0. registry      — PDA `[b"doc", document_id]` · writable
 *   1. attestation   — PDA `[b"sig", document_id, signer]` · writable, init
 *   2. signer        — signer, writable (pays rent for attestation account)
 *   3. system_program
 */
export function attestSignatureIx(args: {
  signer: PublicKey;
  documentId: Uint8Array;
  signature: Uint8Array;
  messageHash: Uint8Array;
  kind: AttestationKindValue;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = args.programId ?? PROGRAM_ID;
  const documentId = fixedBytes(args.documentId, 16);
  const signature = fixedBytes(args.signature, 64);
  const messageHash = fixedBytes(args.messageHash, 32);

  const [registry] = documentPda(documentId);
  const [attestation] = signatureAttestationPda(documentId, args.signer);

  // Borsh layout: discriminator(8) + document_id(16) + signature(64) + message_hash(32) + kind(1)
  const data = new Uint8Array(8 + 16 + 64 + 32 + 1);
  data.set(discriminator('attest_signature'), 0);
  data.set(documentId, 8);
  data.set(signature, 8 + 16);
  data.set(messageHash, 8 + 16 + 64);
  data[8 + 16 + 64 + 32] = args.kind & 0xff;

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: registry, isSigner: false, isWritable: true },
      { pubkey: attestation, isSigner: false, isWritable: true },
      { pubkey: args.signer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

/**
 * Canonical signing message — what each signer attests to. Future signers
 * verify their signature against `sha256(canonicalSigningMessage(...))`. For
 * Sprint 2 self-sign demo we store zero-bytes signature; v1.1 will require
 * ed25519 sibling-ix verification on multi-party flows.
 */
export function canonicalSigningMessage(args: {
  documentIdHex: string;
  canonicalHashHex: string;
  signerB58: string;
  timestampIso: string;
}): string {
  return [
    'YourSign Document Signature v1',
    `Document: ${args.documentIdHex}`,
    `Hash: ${args.canonicalHashHex}`,
    `Signer: ${args.signerB58}`,
    `Timestamp (UTC): ${args.timestampIso}`,
    '',
  ].join('\n');
}

/** Generate a random 16-byte ULID-like id. Time-prefixed, lexicographically sortable. */
export function newDocumentId(): Uint8Array {
  const out = new Uint8Array(16);
  const ts = BigInt(Date.now());
  // 6 bytes big-endian timestamp
  out[0] = Number((ts >> 40n) & 0xffn);
  out[1] = Number((ts >> 32n) & 0xffn);
  out[2] = Number((ts >> 24n) & 0xffn);
  out[3] = Number((ts >> 16n) & 0xffn);
  out[4] = Number((ts >> 8n) & 0xffn);
  out[5] = Number(ts & 0xffn);
  // 10 bytes randomness
  crypto.getRandomValues(out.subarray(6));
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error('hex length must be even');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
