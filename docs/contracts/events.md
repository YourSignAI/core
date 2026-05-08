# Contract — Audit events

> Append-only log of every meaningful state change. Persisted in Postgres `audit_events` (DB enforces append-only via trigger). The shape MUST match this contract exactly — tests assert against it.

## Event envelope

```ts
interface AuditEventEnvelope {
  id: string;             // ULID
  ts: string;             // ISO-8601 UTC
  workspaceId: string;
  documentId?: string;
  actor: {
    type: "user" | "system" | "notary" | "anonymous";
    pubkey?: string;      // for user/notary
    email?: string;
    ip?: string;          // hashed (sha256) for privacy
    userAgent?: string;   // truncated to 120 chars
  };
  type: AuditEventType;
  payload: AuditPayloadByType[AuditEventType];
  txSignature?: string;   // if event has an on-chain counterpart
  parentEventId?: string; // for caused-by chains
}
```

## Event types

| Type                          | Trigger                                 | Has on-chain counterpart |
| ----------------------------- | --------------------------------------- | ------------------------ |
| `auth.siws.challenge`         | challenge issued                        | no                       |
| `auth.siws.success`           | session JWT issued                      | no                       |
| `auth.siws.failure`           | invalid signature                       | no                       |
| `document.created`            | `POST /documents`                       | no                       |
| `document.canon.computed`     | `POST /documents/:id/canon` accepted    | no                       |
| `document.registered`         | worker anchored `register_document`     | yes                      |
| `document.shared`             | `POST /documents/:id/share`             | no                       |
| `document.opened`             | recipient first opens magic link        | no                       |
| `signature.message.shown`     | recipient shown sign prompt             | no                       |
| `signature.attested`          | attestation written on-chain            | yes                      |
| `signature.declined`          | recipient declines                      | yes                      |
| `document.completed`          | last required signer attested           | yes                      |
| `payment.requested`           | Solana Pay tx request issued            | no                       |
| `payment.confirmed`           | USDC transfer finalized on-chain        | yes                      |
| `notary.counter.attested`     | notary counter-signs                    | yes                      |
| `audit.bundle.exported`       | owner downloaded audit bundle           | no                       |

## Per-type payload schemas

### `document.created`

```json
{
  "filename": "Contrato_Acme.pdf",
  "sizeBytes": 142000,
  "contentType": "application/pdf"
}
```

### `document.canon.computed`

```json
{
  "hash": "9f86...",
  "algorithm": "yoursign.canon.v1",
  "fieldCount": 3
}
```

### `document.registered`

```json
{
  "merkleProofUrl": "https://...",
  "compressedAccountAddress": "...",
  "slot": 304928432
}
```

### `document.shared`

```json
{
  "shareId": "shr_...",
  "recipientCount": 2,
  "ordering": "parallel" 
}
```

### `signature.attested`

```json
{
  "signer": "Recip1...",
  "signature": "base58 sig",
  "messageHash": "...",
  "compressedAccountAddress": "...",
  "slot": 304928500
}
```

### `signature.declined`

```json
{
  "signer": "Recip1...",
  "reason": "Not authorized to sign on behalf of ACME"
}
```

### `payment.confirmed`

```json
{
  "feature": "notarize",
  "amountUsdc": "1000000",
  "txSignature": "...",
  "fromAta": "...",
  "toEscrowVault": "..."
}
```

## Append-only guarantee

`audit_events` table is append-only:

```sql
CREATE TRIGGER audit_events_no_update_or_delete
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION raise_immutable();

CREATE OR REPLACE FUNCTION raise_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$ LANGUAGE plpgsql;
```

## Bundle export format

Audit bundle for a document is a `.zip` containing:

```
manifest.json          # AuditEventEnvelope[] for this document
document.pdf           # the completed PDF
proof.json             # GET /v/documents/:id/proof response
README.txt             # human-readable timeline
```

The manifest hash MUST match the `merkle_root` stored on-chain (AC-7.2.1).
