# Contract — REST + WS API

> Canonical source of truth for what `apps/api` exposes. `packages/schemas` is generated from this. Tests assert against this.

Base URL: `https://api.yoursign.tech` (prod) · `http://localhost:4000` (dev).

Auth: `Authorization: Bearer <JWT>` for protected routes. JWT issued via SIWS handshake. Anonymous routes for the verifier.

## REST endpoints

### Auth

#### `POST /auth/siws/challenge`

Initiates a Sign-In with Solana handshake.

```json
// request
{ "pubkey": "3pz4..." }

// response
{
  "challengeId": "uuid",
  "message": "yoursign.tech wants you to sign in with your Solana account...",
  "expiresAt": "2026-05-08T14:05:00Z"
}
```

#### `POST /auth/siws/verify`

```json
// request
{
  "challengeId": "uuid",
  "signature": "base58 ed25519 sig",
  "pubkey": "3pz4..."
}

// response 200
{
  "token": "<JWT>",
  "expiresAt": "...",
  "identity": { "pubkey": "3pz4...", "displayName": null, "kycLevel": "none" }
}

// response 401: { "error": "INVALID_SIGNATURE" } | { "error": "CHALLENGE_EXPIRED" }
```

### Documents

#### `POST /documents`

Create a document record. Auth required.

```json
// request
{
  "filename": "Contrato_Acme.pdf",
  "sizeBytes": 142000,
  "contentType": "application/pdf"
}

// response 201
{
  "documentId": "doc_01H...",
  "uploadUrl": "https://...",   // signed URL to upload original PDF (server-side staging only — encrypted before persistence)
  "createdAt": "..."
}
```

#### `POST /documents/:id/canon`

Submit the canonical hash + detected fields. Calculated client-side.

```json
// request
{
  "hash": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "canonAlgorithm": "yoursign.canon.v1",
  "fields": [
    { "id": "f1", "type": "signature", "page": 1, "x": 0.11, "y": 0.14, "w": 0.32, "h": 0.06, "source": "auto" },
    { "id": "f2", "type": "signature", "page": 1, "x": 0.57, "y": 0.14, "w": 0.32, "h": 0.06, "source": "auto" },
    { "id": "f3", "type": "date",      "page": 1, "x": 0.71, "y": 0.07, "w": 0.18, "h": 0.04, "source": "manual" }
  ]
}

// response 200
{
  "documentId": "doc_01H...",
  "status": "ready",
  "registeredOnChain": false  // becomes true after worker confirms
}
```

#### `POST /documents/:id/share`

Share with recipients. Encryption is done client-side; this endpoint receives wrapped DEKs only.

```json
// request
{
  "ciphertextUri": "ar://Tx...",   // Arweave URL
  "ciphertextSha256": "...",
  "recipients": [
    {
      "pubkey": "Recip1...",
      "wrappedDek": "base64",
      "email": "mariana@acme.com",
      "fieldsAssigned": ["f2"],
      "order": 2
    }
  ],
  "ordering": "parallel"   // "parallel" | "ordered"
}

// response 201
{
  "shareId": "shr_01H...",
  "magicLinks": [{ "pubkey": "Recip1...", "url": "https://yoursign.tech/s/abc..." }]
}
```

#### `GET /documents/:id`

Returns metadata only. The platform never sees plaintext.

```json
// response 200
{
  "documentId": "doc_01H...",
  "filename": "Contrato_Acme.pdf",
  "hash": "9f86...",
  "status": "awaiting | sent | partial | completed | declined",
  "owner": "3pz4...",
  "fields": [...],
  "signatures": [
    {
      "signer": "Recip1...",
      "signedAt": "...",
      "txSignature": "5J...",
      "compressed": true,
      "merkleProofUrl": "https://..."
    }
  ],
  "ciphertextUri": "ar://Tx..."
}
```

### Signatures

#### `POST /documents/:id/signatures`

Recipient submits a signed message. Auth: SIWS as the recipient, OR magic-link token.

```json
// request
{
  "messagePlain": "YourSign v1\nDocument: ...",
  "signature": "base58",
  "signerPubkey": "Recip1...",
  "txSignature": "5J..."  // optional — if client already anchored on-chain
}

// response 201
{
  "attestationId": "att_01H...",
  "txSignature": "5J...",
  "compressedAccountAddress": "...",
  "documentStatus": "partial"
}
```

#### `POST /documents/:id/decline`

```json
// request
{ "reason": "Not authorized to sign on behalf of ACME", "signature": "base58" }

// response 200: { "documentStatus": "declined" }
```

### Payments

#### `POST /payments/transaction-request`

Returns a Solana Pay transaction request payload (URL-encoded).

```json
// request
{
  "documentId": "doc_01H...",
  "feature": "notarize" | "threshold_escrow" | "extra_signers"
}

// response 200
{
  "label": "YourSign Notarization",
  "icon": "https://...",
  "transaction": "base64 encoded serialized tx (USDC transfer)",
  "reference": "ref_pubkey",
  "amount": "1.00",
  "splToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}
```

#### `GET /payments/:reference/status`

```json
// response 200
{
  "reference": "ref_pubkey",
  "status": "pending | confirmed | finalized | failed",
  "txSignature": "5J..."
}
```

### Verification (anonymous)

#### `GET /v/documents/:id/proof`

Public, no auth. Returns the proof bundle so a third party can verify offline.

```json
// response 200
{
  "documentId": "...",
  "hash": "...",
  "attestations": [
    {
      "signer": "...",
      "signature": "...",
      "txSignature": "...",
      "slot": 304928432,
      "merkleProof": [...],
      "compressedAccountAddress": "..."
    }
  ],
  "completedAt": "...",
  "merkleRootOfSignatures": "..."
}
```

## WebSocket events

Channel: `wss://api.yoursign.tech/ws/documents/:id` (auth via JWT in subprotocol).

```ts
type Event =
  | { type: "signature.received"; signer: string; txSignature: string }
  | { type: "signature.declined"; signer: string; reason: string }
  | { type: "document.completed"; merkleRoot: string }
  | { type: "anchor.confirmed"; txSignature: string }
  | { type: "payment.confirmed"; feature: string };
```

## Error envelope

All error responses follow:

```json
{
  "error": "MACHINE_READABLE_CODE",
  "message": "Human-readable summary",
  "details": { "field": "value" },
  "traceId": "..."
}
```

Common codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `PDF_ALREADY_ENCRYPTED`, `PDF_UNSUPPORTED_FEATURE`, `INVALID_SIGNATURE`, `CHALLENGE_EXPIRED`, `RATE_LIMITED`, `CHAIN_UNAVAILABLE`.

## Versioning

- Major version in URL: `/v1/...`. Current default: omitted = `v1`.
- Schema additions (new fields) are non-breaking. Field removals or type changes require `/v2`.
