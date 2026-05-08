// Canonical agent messages. ADR-0007. UTF-8, LF newlines, no BOM.
// Byte-string MUST match the on-chain reconstruction byte-for-byte.
import { sha256 } from '@noble/hashes/sha256';
import type { ToolId } from './scope.js';

export type DelegationMessageInput = {
  principal: string;     // base58 pubkey
  agent: string;         // base58 pubkey
  tools: ToolId[];
  documentsClause: string; // human-printable: "any" | "hashes: a,b,c" | "workspace: <id>"
  spendCapMicroUsdc: number;
  expiresAt: string;     // ISO 8601 UTC
  nonce: string;         // hex, 64 chars
};

export function canonicalDelegationMessage(i: DelegationMessageInput): string {
  return [
    'YourSign Agent Delegation v1',
    `Principal: ${i.principal}`,
    `Agent: ${i.agent}`,
    'Scope:',
    `  Tools: ${[...i.tools].sort().join(',')}`,
    `  Documents: ${i.documentsClause}`,
    `  SpendCap (USDC, micro): ${i.spendCapMicroUsdc}`,
    `  Expires (UTC): ${i.expiresAt}`,
    `Nonce: ${i.nonce}`,
    '',
  ].join('\n');
}

export type ActionMessageInput = {
  delegationId: string;  // hex, 32 chars (16 bytes)
  tool: ToolId;
  targetId: string;      // hex, 64 chars (32 bytes)
  timestamp: string;     // ISO 8601 UTC
  nonce: string;         // hex, 64 chars
};

export function canonicalActionMessage(i: ActionMessageInput): string {
  return [
    'YourSign Agent Action v1',
    `Delegation: ${i.delegationId}`,
    `Action: ${i.tool}`,
    `Target: ${i.targetId}`,
    `Timestamp (UTC): ${i.timestamp}`,
    `Nonce: ${i.nonce}`,
    '',
  ].join('\n');
}

export type RevokeMessageInput = {
  delegationId: string;
  nonce: string;
};

export function canonicalRevokeMessage(i: RevokeMessageInput): string {
  return [
    'YourSign Agent Revoke v1',
    `Delegation: ${i.delegationId}`,
    `Nonce: ${i.nonce}`,
    '',
  ].join('\n');
}

export function hashMessage(s: string): Uint8Array {
  return sha256(new TextEncoder().encode(s));
}
