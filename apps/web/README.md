# `apps/web`

The user-facing web app: landing, editor, dashboard, sign flow.

- Framework: Next.js 16 App Router (Server Components by default; `'use client'` only where interactivity demands).
- UI: shadcn/ui + the shared `@yoursign/ui` package, all derived from `your-sign_prototype/index.html`.
- Wallets: `@solana/wallet-adapter-react` + Privy SDK.
- PDF: `pdf-lib` (edit/embed) + `pdfjs-dist` (parse/render).

## Surface

```
app/
├── (public)/
│   ├── page.tsx                # Landing (prototype Screen 1)
│   ├── sign/[token]/page.tsx   # Recipient signing flow (Screens 3 + 4)
│   └── layout.tsx
├── (app)/
│   ├── page.tsx                # Dashboard (Screen 5)
│   ├── d/[id]/page.tsx         # Editor (Screen 2)
│   └── layout.tsx
├── proxy.ts                    # Next.js 16 proxy (auth gate, rewrites)
└── layout.tsx
```

> Note: Next.js 16 uses `proxy.ts`, not `middleware.ts`. See `vercel-plugin:nextjs` skill.

## What it depends on (workspace)

- `@yoursign/ui` — components ported from prototype
- `@yoursign/schemas` — Zod DTOs
- `@yoursign/solana-sdk` — wallet + program clients
- `@yoursign/crypto` — client-side encryption helpers
- `@yoursign/pdf-engine` — canonical hash + field detection (browser bundle)

## Spec refs

Implements UI for AC-1.*, AC-2.*, AC-3.* (client side), AC-4.* (signing trigger), AC-5.* (entry to verifier).

## Status

Stub. Skeleton folder only until Phase 1.
