// MCP tool: yoursign.delegate
// Returns a `solana:` deep-link the principal opens in their wallet (Phantom).
// Server NEVER signs the delegation message — only the principal can. AC-10.4.2.

import { z } from 'zod';
import {
  AgentScopeSchema,
  canonicalDelegationMessage,
  canonicalScopeJson,
  hashScope,
  type AgentScope,
} from '@yoursign/agent-sdk';
import type { Env } from '../env.js';

export const DelegateInput = z.object({
  principal: z.string().min(32), // base58 pubkey
  agent: z.string().min(32),     // base58 pubkey (the worker-managed agent for this workspace)
  scope: AgentScopeSchema,
  workspaceId: z.string().min(1),
});

export type DelegateOutput = {
  message: string;
  messageHashHex: string;
  scopeHashHex: string;
  scopeUri: string;       // r2://bucket/<scope_hash>
  walletDeepLink: string; // solana:...
  nonceHex: string;
};

function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function randomNonce(): Uint8Array {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return a;
}

function documentsClause(scope: AgentScope): string {
  const d = scope.documents;
  if (d === 'any') return 'any';
  if ('hashes' in d) return `hashes: ${[...d.hashes].sort().join(',')}`;
  return `workspace: ${d.workspaceId}`;
}

export async function delegate(env: Env, input: z.infer<typeof DelegateInput>): Promise<DelegateOutput> {
  const parsed = DelegateInput.parse(input);
  const nonce = randomNonce();
  const nonceHex = bytesToHex(nonce);
  const scopeHash = hashScope(parsed.scope);
  const scopeHashHex = bytesToHex(scopeHash);

  // Anchor scope JSON in R2 keyed by hash. Idempotent: if exists, leave it.
  const existing = await env.SCOPES.head(scopeHashHex);
  if (!existing) {
    await env.SCOPES.put(scopeHashHex, canonicalScopeJson(parsed.scope), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: { workspaceId: parsed.workspaceId },
    });
  }

  const message = canonicalDelegationMessage({
    principal: parsed.principal,
    agent: parsed.agent,
    tools: parsed.scope.tools,
    documentsClause: documentsClause(parsed.scope),
    spendCapMicroUsdc: parsed.scope.spendCapMicroUsdc,
    expiresAt: parsed.scope.expiresAt,
    nonce: nonceHex,
  });

  const messageHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  const messageHashHex = bytesToHex(new Uint8Array(messageHash));

  // Phantom signMessage deep-link. App handles the actual register_agent ix submission
  // after the wallet returns the signature.
  const walletDeepLink =
    'solana:phantom?action=signMessage&message=' +
    encodeURIComponent(message);

  return {
    message,
    messageHashHex,
    scopeHashHex,
    scopeUri: `r2://${env.SCOPE_R2_BUCKET}/${scopeHashHex}`,
    walletDeepLink,
    nonceHex,
  };
}
