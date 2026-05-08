// Program id pinned per cluster. Update post-mainnet deploy (Sprint 4 Wed).

import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID_STR = '35RbwNgx9Em28mMLZ6iWzjCnaTd4tD2NWuxrHqR76M8X';
export const PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);

export const USDC_MINT_MAINNET = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
);

export const TOOL_MANIFEST_SEED = Buffer.from('tool-manifest');
export const DELEGATION_SEED = Buffer.from('delegation');
export const ACTION_SEED = Buffer.from('action');
export const DOC_SEED = Buffer.from('doc');
