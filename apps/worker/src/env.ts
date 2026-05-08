export type Env = {
  SOLANA_CLUSTER: 'devnet' | 'mainnet-beta';
  SOLANA_RPC_URL: string;
  PROGRAM_ID: string;
  // Sprint 2 Thursday: Queue<...> bindings + worker secret for anchoring keypair.
};

export type AnchorJobMessage =
  | { kind: 'anchor-document'; documentId: string; canonicalHashHex: string; ownerB58: string }
  | { kind: 'anchor-signature'; documentId: string; signerB58: string; signatureHex: string };
