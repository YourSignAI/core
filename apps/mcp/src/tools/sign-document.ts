// MCP tool: yoursign.sign_document
// Constructs canonical action message, signs with the workspace agent keypair,
// then returns the structured payload that `apps/api` (or this Worker directly,
// once Solana RPC pieces are wired) submits as a co-tx with `attest_signature`.
// AC-10.2.4 — agent action and signature attestation share target_id.

import { z } from 'zod';
import {
  canonicalActionMessage,
  hashMessage,
  signMessageHash,
} from '@yoursign/agent-sdk';
import type { Env } from '../env.js';

export const SignDocumentInput = z.object({
  delegationId: z.string().regex(/^[0-9a-f]{32}$/),
  documentHashHex: z.string().regex(/^[0-9a-f]{64}$/),
  workspaceId: z.string().min(1),
});

export type SignDocumentOutput = {
  actionMessage: string;
  actionMessageHashHex: string;
  agentSigHex: string;
  nonceHex: string;
  timestamp: string;
};

function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(h: string): Uint8Array {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function randomNonceHex(): string {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return bytesToHex(a);
}

function loadAgentSecret(env: Env): Uint8Array {
  // TODO: per-workspace key in MCP_SESSIONS KV. Demo path uses a single key.
  if (!env.AGENT_KEYPAIR_SECRET) throw new Error('AGENT_KEYPAIR_SECRET not configured');
  // base64 of 32 raw secret bytes
  const bin = atob(env.AGENT_KEYPAIR_SECRET);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  if (out.length !== 32) throw new Error('AGENT_KEYPAIR_SECRET must decode to 32 bytes');
  return out;
}

export async function signDocument(env: Env, input: z.infer<typeof SignDocumentInput>): Promise<SignDocumentOutput> {
  const parsed = SignDocumentInput.parse(input);
  const nonceHex = randomNonceHex();
  const timestamp = new Date().toISOString();
  const actionMessage = canonicalActionMessage({
    delegationId: parsed.delegationId,
    tool: 'sign_document',
    targetId: parsed.documentHashHex,
    timestamp,
    nonce: nonceHex,
  });
  const messageHash = hashMessage(actionMessage);
  const secret = loadAgentSecret(env);
  const sig = await signMessageHash(messageHash, secret);
  // zero out secret reference (best-effort)
  secret.fill(0);
  return {
    actionMessage,
    actionMessageHashHex: bytesToHex(messageHash),
    agentSigHex: bytesToHex(sig),
    nonceHex,
    timestamp,
  };
}

export const _internal = { hexToBytes, bytesToHex };
