// MCP tool: yoursign.revoke
// Returns the canonical revocation message + Phantom deep-link. Server never
// signs; the principal does. AC-10.4.4.

import { z } from 'zod';
import { canonicalRevokeMessage, hashMessage } from '@yoursign/agent-sdk';
import type { Env } from '../env.js';

export const RevokeInput = z.object({
  delegationId: z.string().regex(/^[0-9a-f]{32}$/),
});

export type RevokeOutput = {
  message: string;
  messageHashHex: string;
  walletDeepLink: string;
  nonceHex: string;
};

function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function randomNonceHex(): string {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return bytesToHex(a);
}

export async function revoke(_env: Env, input: z.infer<typeof RevokeInput>): Promise<RevokeOutput> {
  const parsed = RevokeInput.parse(input);
  const nonceHex = randomNonceHex();
  const message = canonicalRevokeMessage({ delegationId: parsed.delegationId, nonce: nonceHex });
  const messageHashHex = bytesToHex(hashMessage(message));
  const walletDeepLink = 'solana:phantom?action=signMessage&message=' + encodeURIComponent(message);
  return { message, messageHashHex, walletDeepLink, nonceHex };
}
