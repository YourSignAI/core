import { PublicKey } from '@solana/web3.js';
import { DELEGATION_SEED, ACTION_SEED, DOC_SEED, SIG_SEED, TOOL_MANIFEST_SEED, PROGRAM_ID } from './constants.js';

export function delegationPda(principal: PublicKey, nonce: Uint8Array): [PublicKey, number] {
  if (nonce.length !== 32) throw new Error('nonce must be 32 bytes');
  return PublicKey.findProgramAddressSync(
    [DELEGATION_SEED, principal.toBuffer(), Buffer.from(nonce)],
    PROGRAM_ID,
  );
}

export function actionPda(actionId: Uint8Array): [PublicKey, number] {
  if (actionId.length !== 16) throw new Error('action_id must be 16 bytes');
  return PublicKey.findProgramAddressSync([ACTION_SEED, Buffer.from(actionId)], PROGRAM_ID);
}

export function documentPda(documentId: Uint8Array): [PublicKey, number] {
  if (documentId.length !== 16) throw new Error('document_id must be 16 bytes');
  return PublicKey.findProgramAddressSync([DOC_SEED, Buffer.from(documentId)], PROGRAM_ID);
}

export function signatureAttestationPda(
  documentId: Uint8Array,
  signer: PublicKey,
): [PublicKey, number] {
  if (documentId.length !== 16) throw new Error('document_id must be 16 bytes');
  return PublicKey.findProgramAddressSync(
    [SIG_SEED, Buffer.from(documentId), signer.toBuffer()],
    PROGRAM_ID,
  );
}

export function toolManifestPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([TOOL_MANIFEST_SEED], PROGRAM_ID);
}
