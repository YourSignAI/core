// Pure TypeScript domain. No IO, no fetch, no DB.

export type DocumentStatus = 'awaiting' | 'partial' | 'completed' | 'declined';
export type DelegationStatus = 'active' | 'revoked' | 'expired';

export type Submitter = {
  pubkey: string;
  displayName?: string;
  email?: string;
  kycLevel: 'none' | 'email_verified' | 'icp_brasil';
};

export type Submission = {
  documentId: string;       // ULID
  ownerPubkey: string;
  workspaceId: string;
  canonicalHashHex: string;
  filename: string;
  status: DocumentStatus;
  requiredSigners: number;
  completedSigners: number;
  createdAt: string;
};

export type AgentDelegationView = {
  delegationId: string;     // hex 32
  principalPubkey: string;
  agentPubkey: string;
  scopeHashHex: string;
  scopeJsonUri: string;     // r2://...
  status: DelegationStatus;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
};

export type AgentActionView = {
  actionId: string;
  delegationId: string;
  actionKind: 'delegate' | 'sign_document' | 'verify' | 'revoke';
  targetIdHex: string;
  timestamp: string;
  slot: number;
};

export const DOMAIN_VERSION = '0.1.0';
