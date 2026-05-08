# 02 — Architecture

This is the **HOW** companion to `01-spec.md`. Diagrams in Mermaid (GitHub-renderable). Component boundaries match workspace boundaries — if you can't point to a folder, the component shouldn't exist.

## C1 — System context

```mermaid
graph LR
  user(["User<br/>(sender or signer)"])
  notary(["ICP-Brasil notary<br/>(optional)"])
  judge(["External auditor<br/>or judge"])

  subgraph YourSign
    web["Web app<br/>(apps/web)"]
    api["API<br/>(apps/api)"]
    worker["Worker<br/>(apps/worker)"]
    verifier["Public verifier<br/>(apps/verifier)"]
  end

  subgraph Solana
    program["yoursign program<br/>(programs/yoursign)"]
    light["Light Protocol<br/>compressed accounts"]
    pay["Solana Pay<br/>(USDC SPL)"]
  end

  subgraph Off-chain
    arweave["Arweave / Irys<br/>(ciphertext)"]
    db["Postgres<br/>(metadata, audit)"]
    privy["Privy MPC<br/>(invisible wallets)"]
  end

  user -->|HTTPS| web
  web -->|REST/WS| api
  web -->|signMessage| user
  api --> db
  api --> worker
  worker --> arweave
  worker --> program
  program --> light
  api --> privy
  user -->|USDC payment| pay
  pay --> program
  judge -->|verify| verifier
  verifier --> program
  notary -.->|counter-signature| api
```

## C2 — Container view

```mermaid
graph TB
  subgraph Frontend
    web[Next.js 16 App Router<br/>apps/web]
    verifier[Next.js read-only<br/>apps/verifier]
  end

  subgraph Backend
    api[Fastify · Node 24<br/>apps/api]
    worker[BullMQ workers<br/>apps/worker]
  end

  subgraph Shared
    domain[core-domain<br/>Submitter, Submission, Template]
    pdf[pdf-engine<br/>parse, canonicalize, embed]
    sdk[solana-sdk<br/>Anchor client]
    crypto[crypto<br/>X25519, AES-GCM, threshold]
    schemas[schemas<br/>Zod DTOs]
    ui[ui<br/>shadcn components]
  end

  subgraph Persistence
    pg[(Postgres<br/>Neon)]
    redis[(Redis<br/>Upstash)]
    blob[(Arweave/Irys)]
  end

  subgraph Chain
    program[yoursign Anchor<br/>programs/yoursign]
  end

  web --> ui
  web --> schemas
  web --> sdk
  web --> crypto
  api --> domain
  api --> schemas
  api --> sdk
  api --> pg
  api --> redis
  worker --> pdf
  worker --> sdk
  worker --> blob
  verifier --> sdk
  sdk --> program
```

## C3 — Component view (per app)

### `apps/web`

```mermaid
graph TB
  routes[App Router<br/>app/]
  routes --> landing[/Landing<br/>app/(public)/page.tsx/]
  routes --> editor[/Editor<br/>app/(app)/d/[id]/page.tsx/]
  routes --> dashboard[/Dashboard<br/>app/(app)/page.tsx/]
  routes --> signFlow[/Sign flow<br/>app/(public)/sign/[token]/page.tsx/]

  signFlow --> walletAdapter[Wallet Adapter]
  signFlow --> privy[Privy SDK]
  editor --> pdfViewer[PDF.js viewer]
  editor --> fieldEditor[Field overlay editor]

  walletAdapter --> sdk[solana-sdk]
  privy --> sdk
  sdk --> rpc[Solana RPC]
```

### `apps/api`

```mermaid
graph TB
  app[Fastify app]
  app --> auth[/auth<br/>SIWS, Privy/]
  app --> docs[/documents<br/>CRUD, share/]
  app --> sign[/signatures<br/>collect, anchor/]
  app --> pay[/payments<br/>Solana Pay/]
  app --> events[/events<br/>WS broadcast/]

  auth --> domain[core-domain]
  docs --> domain
  sign --> domain
  domain --> pg[(Postgres)]
  domain --> queue[BullMQ]
  queue --> worker[apps/worker]
```

### `apps/worker`

```mermaid
graph TB
  consumer[BullMQ consumer]
  consumer --> canon[canonicalize PDF]
  consumer --> ocr[detect fields]
  consumer --> embed[embed signatures]
  consumer --> upload[upload ciphertext]
  consumer --> anchor[anchor on Solana]

  canon --> pdf[pdf-engine]
  ocr --> pdf
  embed --> pdf
  upload --> arweave[(Arweave/Irys)]
  anchor --> sdk[solana-sdk]
  sdk --> program[yoursign program]
```

### `programs/yoursign` (Anchor)

```mermaid
graph TB
  registry[(DocumentRegistry<br/>compressed)]
  attestation[(SignatureAttestation<br/>compressed)]
  pricing[(PricingConfig<br/>regular)]
  escrow[(EscrowVault<br/>regular)]

  ix1[ix: register_document]
  ix2[ix: attest_signature]
  ix3[ix: complete_document]
  ix4[ix: pay_for_premium]
  ix5[ix: notarize_counter]

  ix1 --> registry
  ix2 --> attestation
  ix3 --> registry
  ix3 --> attestation
  ix4 --> escrow
  ix4 --> pricing
  ix5 --> attestation
```

## Data flow — happy path

```mermaid
sequenceDiagram
  autonumber
  participant U as User (sender)
  participant W as Web
  participant A as API
  participant Wk as Worker
  participant Ar as Arweave
  participant Sl as Solana
  participant R as Recipient

  U->>W: Drop PDF
  W->>A: POST /documents (metadata)
  A-->>W: documentId, uploadUrl
  W->>W: SHA-256 + canonicalize (browser)
  W->>A: POST /documents/{id}/canon (hash, fields)
  A->>Wk: queue: anchor-document
  Wk->>Sl: register_document(hash, ownerPubkey)
  Wk-->>A: txSig
  A-->>W: ready

  U->>W: Add recipient(s) + send
  W->>W: generate DEK, wrap per recipient
  W->>Ar: upload ciphertext
  W->>A: POST /documents/{id}/share (wrappedKeys, arweaveUri)
  A-->>R: email magic link

  R->>W: open link
  W->>W: connect wallet, decrypt
  R->>W: approve message
  W->>Sl: attest_signature(docId, sigBytes, signerPubkey)
  Sl-->>W: txSig
  W->>A: POST /documents/{id}/signatures (txSig, sig)
  A-->>U: WS event "signature.received"
```

## Cross-cutting concerns

- **Observability.** OpenTelemetry from `apps/api` + `apps/worker` → Datadog (or Vercel observability). One trace per document lifecycle.
- **Auth.** SIWS (Sign-In with Solana) for the platform; Privy session JWTs accepted as a delegate for embedded wallets. (See ADR-0006.)
- **Rate limits.** Per-pubkey, per-IP. Free tier capped at 5 multi-party docs/month.
- **Data residency.** Arweave is global; Postgres lives in `gru1` (São Paulo) for LGPD friendliness.
- **Failure modes.** Solana RPC down → retry with exponential backoff (BullMQ). Arweave bundler down → fall back to S3 with a "pending finality" badge.

## What we deliberately don't have

- **No microservice gateway.** One Fastify app. One worker process. We split when load demands.
- **No GraphQL.** REST + WS. Schemas owned by `packages/schemas`.
- **No Kubernetes.** Vercel Functions + a single long-running worker on Fly/Railway.
- **No on-chain frontend state.** Solana stores attestations only. Display layer is web.
