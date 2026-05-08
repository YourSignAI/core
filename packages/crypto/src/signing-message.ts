// Spec AC-4.1.1 — canonical YourSign signing message. UTF-8, LF newlines, no
// BOM. The on-chain `attest_signature` ix reconstructs this byte-string before
// SHA-256 + ed25519 verify; any drift breaks the chain.

export type SigningMessageInput = {
  filename: string;
  hashHex: string;     // 64 lowercase hex chars
  signerB58: string;   // base58 pubkey
  timestampIso: string;
  workspaceId: string;
  nonceHex: string;
};

export function canonicalSigningMessage(i: SigningMessageInput): string {
  if (!/^[0-9a-f]{64}$/.test(i.hashHex)) throw new Error('hashHex must be 64 lowercase hex chars');
  return [
    'YourSign v1',
    `Document: ${i.filename}`,
    `Hash (SHA-256): ${i.hashHex}`,
    `Signer: ${i.signerB58}`,
    `Timestamp (UTC): ${i.timestampIso}`,
    `Workspace: ${i.workspaceId}`,
    `Nonce: ${i.nonceHex}`,
    '',
  ].join('\n');
}
