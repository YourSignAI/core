# Sequence — End-to-end signing flow

The "happy path" from upload to anchored attestation. References AC-1.* through AC-4.* in `docs/01-spec.md`.

```mermaid
sequenceDiagram
  autonumber
  actor Sender
  participant Web as apps/web
  participant Crypto as packages/crypto
  participant API as apps/api
  participant DB as Postgres
  participant Q as BullMQ
  participant Worker as apps/worker
  participant SDK as packages/solana-sdk
  participant Light as Light Protocol
  participant Solana as Solana mainnet
  participant Arweave as Arweave/Irys
  actor Recipient

  Note over Sender,Web: AC-1.1.* — Upload
  Sender->>Web: drop PDF
  Web->>Web: pdf-engine: parse + canonicalize
  Web->>Crypto: hash = SHA-256(canon(P))
  Web->>API: POST /documents (metadata)
  API->>DB: insert documents row
  API-->>Web: documentId, uploadUrl
  Web->>API: POST /documents/:id/canon (hash, fields)
  API->>Q: enqueue: anchor-document
  API-->>Web: ready

  Note over Worker,Solana: AC-4.2.* — Register
  Q->>Worker: anchor-document job
  Worker->>SDK: register_document(hash, owner)
  SDK->>Light: compress account
  Light->>Solana: tx (instruction CPI)
  Solana-->>SDK: txSig, slot
  SDK-->>Worker: ok
  Worker->>API: PATCH /documents/:id (registeredOnChain=true, txSig)
  API->>DB: append audit_event document.registered

  Note over Sender,Web: AC-3.* — Encrypt + share
  Sender->>Web: add recipients, send
  Web->>Crypto: generate DEK (AES-256-GCM key)
  Web->>Crypto: ciphertext = AES-GCM(DEK, plaintext)
  Web->>Crypto: wrappedDek_i = X25519-wrap(DEK, recipient_i_pub)
  Web->>Arweave: upload(ciphertext)
  Arweave-->>Web: ar://Tx
  Web->>API: POST /documents/:id/share (ciphertextUri, wrappedDeks)
  API->>DB: insert shares + recipients
  API-->>Recipient: email magic link

  Note over Recipient,Solana: AC-4.1.* — Sign
  Recipient->>Web: open link
  Web->>Recipient: connect wallet (or Privy)
  Web->>API: GET /documents/:id (proof bundle)
  API-->>Web: metadata + ciphertextUri + wrappedDek
  Web->>Crypto: unwrap DEK with recipient privkey
  Web->>Arweave: fetch ciphertext
  Web->>Crypto: plaintext = AES-GCM-decrypt(DEK, ciphertext)
  Web->>Web: render PDF with detected fields
  Web->>Recipient: show signing message
  Recipient->>Web: approve (wallet.signMessage)
  Web->>SDK: attest_signature(docId, sig, signerPubkey)
  SDK->>Light: compress attestation
  Light->>Solana: tx
  Solana-->>SDK: txSig
  SDK-->>Web: ok
  Web->>API: POST /documents/:id/signatures (txSig)
  API->>DB: append audit_event signature.attested
  API-->>Sender: WS event signature.received

  alt all required signers attested
    API->>SDK: complete_document(docId)
    SDK->>Solana: tx (sets status=Completed, writes merkle_root)
    Solana-->>SDK: txSig
    API->>DB: update documents.status = completed
    API-->>Sender: WS event document.completed
    Sender->>Web: download completed PDF
    Web->>Crypto: rebuild plaintext
    Web->>Web: pdf-engine: embed visible signatures + audit appendix
    Web-->>Sender: completed PDF
  end
```

## Why this sequence is interesting (for judges)

- **Worker never decrypts.** The worker handles registration and anchoring of *hashes only*. AC-3.* is preserved.
- **Anchoring uses ZK Compression.** Each `attest_signature` is a compressed-account write — that's the cost story.
- **Verifier path is symmetric.** The third-party verifier replays steps 24–27 (without the wallet handshake) using only the public proof bundle.
