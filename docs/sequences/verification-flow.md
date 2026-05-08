# Sequence — Public verification (no YourSign backend)

References AC-5.* in `docs/01-spec.md`.

```mermaid
sequenceDiagram
  autonumber
  actor Auditor
  participant Verifier as apps/verifier
  participant Crypto as packages/crypto
  participant SDK as packages/solana-sdk
  participant Solana as Solana mainnet RPC
  participant Light as Light Protocol RPC

  Auditor->>Verifier: drop PDF + paste documentId
  Verifier->>Crypto: hash = SHA-256(canon(P))
  Verifier->>SDK: getDocumentRegistry(documentId)
  SDK->>Light: read compressed DocumentRegistry
  Light-->>SDK: registry { canonical_hash, status, merkle_root }
  Verifier->>Verifier: compare hash == registry.canonical_hash
  Verifier->>SDK: getSignatureAttestations(documentId)
  SDK->>Light: read compressed SignatureAttestations
  Light-->>SDK: attestations[]
  loop each attestation
    Verifier->>Crypto: ed25519_verify(sig, messageHash, signer)
    Crypto-->>Verifier: ok
  end
  Verifier->>Verifier: rebuild merkle root from attestations
  Verifier->>Verifier: compare against registry.merkle_root
  Verifier-->>Auditor: ✅ all signatures valid + on-chain proof links
```

## Notes

- **Zero YourSign backend in the path.** The verifier site is a static Next.js app fetching from public RPC.
- **CLI parity.** `packages/solana-sdk/bin/verify.ts` runs the exact same logic from a terminal, for offline auditors.
- **What if the document content was altered?** Step 5 fails, verifier reports `HASH_MISMATCH`.
- **What if a signature was forged?** Step 11 fails, verifier reports `BAD_SIGNATURE`.
- **What if an attestation was deleted on-chain?** Compressed accounts are append-only via Merkle tree updates — historical leaves remain provable.
