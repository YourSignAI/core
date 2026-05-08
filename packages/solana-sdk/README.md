# `@yoursign/solana-sdk`

Typed Anchor client + helpers for `programs/yoursign`. Re-exports a unified `WalletInterface` for Phantom/Backpack/Solflare/Privy.

## Public API (target)

```ts
import { Connection } from "@solana/web3.js";

export interface YourSignClient {
  registerDocument(args: RegisterArgs): Promise<TxResult>;
  attestSignature(args: AttestArgs): Promise<TxResult>;
  attestDecline(args: DeclineArgs): Promise<TxResult>;
  payForPremium(args: PayArgs): Promise<TxResult>;
  notarizeCounter(args: NotarizeArgs): Promise<TxResult>; // notary only

  // read-only
  getDocumentRegistry(documentId: Uint8Array): Promise<Registry | null>;
  getSignatureAttestations(documentId: Uint8Array): Promise<Attestation[]>;
  buildSolanaPayUrl(args: PayUrlArgs): Promise<URL>;
}

export function createClient(rpcUrl: string, lightRpcUrl: string): YourSignClient;
```

CLI:

```bash
solana-sdk verify <documentId> --pdf path/to/file.pdf
```

## Spec refs

AC-2.*, AC-4.*, AC-5.*, AC-6.*.

## Status

Stub. Real client lands in Phase 3.
