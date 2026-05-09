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
export const SIG_SEED = Buffer.from('sig');

// Treasury wallet — collects per-instruction fees from the UI flow. v0.1 uses
// a UI-bundled SystemProgram.transfer (technically bypassable by callers
// crafting the tx manually); v1.1 will move enforcement on-chain via an
// instructions-sysvar check inside the program. The treasury keypair lives
// off-repo (private to the founding team).
export const TREASURY_PUBKEY_STR = '5zUvmko9FM3JM4wwXnb8C3HUY6kRRyK2mZYg4V1E9vMm';
export const TREASURY_PUBKEY = new PublicKey(TREASURY_PUBKEY_STR);

// Fee schedule (devnet). Tunable per environment via env override on the web
// app if we need to test cheaper anchors. Production fees will be set per
// ADR-0003 alongside the USDC payment rail.
export const REGISTER_DOCUMENT_FEE_LAMPORTS = 1_000_000; // 0.001 SOL
export const ATTEST_SIGNATURE_FEE_LAMPORTS = 500_000;    // 0.0005 SOL
