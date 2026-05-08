// MCP tool: yoursign.verify
// Stub: returns a structured proof payload by reading on-chain state via
// Light Protocol RPC. Full implementation lands in Sprint 3 Thursday.

import { z } from 'zod';
import type { Env } from '../env.js';

export const VerifyInput = z.object({
  documentHashHex: z.string().regex(/^[0-9a-f]{64}$/),
});

export type VerifyOutput = {
  documentHashHex: string;
  status: 'awaiting_implementation';
  programId: string;
  cluster: string;
  // populated in Sprint 3:
  signatureAttestations?: unknown[];
  agentActions?: unknown[];
};

export async function verify(env: Env, input: z.infer<typeof VerifyInput>): Promise<VerifyOutput> {
  const parsed = VerifyInput.parse(input);
  return {
    documentHashHex: parsed.documentHashHex,
    status: 'awaiting_implementation',
    programId: env.PROGRAM_ID,
    cluster: env.SOLANA_CLUSTER,
  };
}
