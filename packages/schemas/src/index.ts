// Cross-app DTOs. Always import from here, never duplicate a Zod schema.
import { z } from 'zod';

export const PubkeyB58 = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
export const HexHash32 = z.string().regex(/^[0-9a-f]{64}$/);
export const HexId16 = z.string().regex(/^[0-9a-f]{32}$/);
export const Hex32 = HexHash32;
export const IsoDateUtc = z.string().datetime({ offset: false });

// SIWS — CAIP-122 message + nonce. AC-2.3.2.
export const SiwsChallenge = z.object({
  domain: z.string(),
  address: PubkeyB58,
  statement: z.string(),
  uri: z.string().url(),
  version: z.literal('1'),
  chainId: z.literal('mainnet'),
  nonce: z.string().min(8),
  issuedAt: IsoDateUtc,
  expirationTime: IsoDateUtc,
});
export type SiwsChallenge = z.infer<typeof SiwsChallenge>;

export const SiwsVerifyRequest = z.object({
  message: z.string(),
  signature: z.string(), // base64
  pubkey: PubkeyB58,
});

// Documents — Sprint 1 placeholder shape.
export const CreateDocumentRequest = z.object({
  filename: z.string().min(1).max(255),
  byteLength: z.number().int().positive().max(25 * 1024 * 1024),
  workspaceId: z.string().min(1),
});

// Agent (spec §10).
export { TOOL_IDS } from '@yoursign/agent-sdk';
export const ScopeUploadRequest = z.object({
  workspaceId: z.string().min(1),
  scopeJson: z.string(), // raw canonical JSON; server re-hashes to derive scope_hash
});

export const SCHEMAS_VERSION = '0.1.0';
