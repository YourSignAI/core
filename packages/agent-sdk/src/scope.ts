// ADR-0007 §"Scope schema". On-chain anchor is SHA-256 of the canonical JSON; the
// JSON itself is stored off-chain (R2) keyed by that hash.
import { sha256 } from '@noble/hashes/sha256';
import { z } from 'zod';

export const TOOL_IDS = ['delegate', 'sign_document', 'verify', 'revoke'] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export const AgentScopeSchema = z.object({
  tools: z.array(z.enum(TOOL_IDS)).min(1),
  documents: z.union([
    z.literal('any'),
    z.object({ hashes: z.array(z.string().regex(/^[0-9a-f]{64}$/)) }),
    z.object({ workspaceId: z.string().min(1) }),
  ]),
  spendCapMicroUsdc: z.number().int().nonnegative(),
  expiresAt: z.string().datetime({ offset: false }), // ISO 8601 UTC, no offset
});

export type AgentScope = z.infer<typeof AgentScopeSchema>;

// Canonical JSON: deterministic key order, no whitespace. The hash binds content,
// so any deviation in serialization changes the hash.
export function canonicalScopeJson(scope: AgentScope): string {
  AgentScopeSchema.parse(scope);
  const docs = scope.documents;
  let documents: unknown;
  if (docs === 'any') {
    documents = 'any';
  } else if ('hashes' in docs) {
    documents = { hashes: [...docs.hashes].sort() };
  } else {
    documents = { workspaceId: docs.workspaceId };
  }
  const ordered = {
    documents,
    expiresAt: scope.expiresAt,
    spendCapMicroUsdc: scope.spendCapMicroUsdc,
    tools: [...scope.tools].sort(),
  };
  return JSON.stringify(ordered);
}

export function hashScope(scope: AgentScope): Uint8Array {
  return sha256(new TextEncoder().encode(canonicalScopeJson(scope)));
}
