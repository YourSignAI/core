# Sequence — Premium feature payment via Solana Pay (USDC)

References AC-6.* in `docs/01-spec.md`.

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Web as apps/web
  participant API as apps/api
  participant SDK as packages/solana-sdk
  participant Wallet as User's wallet
  participant Solana as Solana mainnet
  participant Program as yoursign program
  participant Treasury as treasury PDA
  actor Notary

  User->>Web: click "notarize this document"
  Web->>API: POST /payments/transaction-request (docId, feature=notarize)
  API->>SDK: build USDC transfer tx (to escrow PDA, amount=1 USDC)
  SDK-->>API: serialized tx, reference
  API-->>Web: solana:URL with tx + reference
  Web->>Wallet: deeplink / scan QR
  Wallet->>User: confirm USDC transfer
  User->>Wallet: approve
  Wallet->>Solana: send tx
  Solana-->>Wallet: txSig
  Web->>API: POST /payments/:reference/confirm
  loop poll until confirmed
    API->>Solana: getSignatureStatus(txSig)
    Solana-->>API: confirmed
  end
  API->>Web: WS event payment.confirmed
  API->>DB: append audit_event payment.confirmed

  Note over Notary,Solana: AC-7.3.1 — Notary counter-sign
  API->>Notary: webhook (docId, escrow funded)
  Notary->>Notary: review document hash via verifier site
  Notary->>SDK: notarize_counter(docId, counterSig)
  SDK->>Program: tx
  Program->>Treasury: claim USDC from escrow
  Program-->>SDK: txSig
  API->>DB: append audit_event notary.counter.attested
  API-->>User: WS event notary.attested
```

## Why we use a transaction request (not a transfer request)

A Solana Pay **transaction request** lets our server inject metadata into the tx (the `reference` pubkey, the document ID via `memo`). This binds the payment to the document on-chain, so anyone can later prove "this payment is for that document" without trusting our DB.
