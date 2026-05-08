# `@yoursign/ui`

Shared component library. Initialized via `pnpm dlx shadcn init`. Designed by porting `your-sign_prototype/index.html` 1:1.

## Components ported from the prototype

Five screens, mapped to components:

| Prototype screen | Components |
| ---------------- | ---------- |
| 01 Landing | `<Hero/>`, `<Dropzone/>`, `<TrustRow/>`, `<HowItWorks/>` |
| 02 Editor | `<EditorLayout/>`, `<PdfPage/>`, `<FieldOverlay/>`, `<EditorSidebar/>` |
| 03 Connect modal | `<ConnectWalletModal/>`, `<WalletRow/>`, `<EmailAuthBlock/>` |
| 04 Sign prompt | `<WalletPrompt/>`, `<DocCard/>`, `<MsgBlock/>`, `<FeeRow/>` |
| 05 Dashboard | `<TopNav/>`, `<DocTable/>`, `<DocRow/>`, `<ActivityStrip/>`, `<StatsRow/>` |

Plus design tokens (Airbnb-Cereal-style) at `src/tokens.css`:

- Solana gradient pill (used **at most twice** per surface — see prototype rules)
- Rausch primary color (`#ff385c`)
- Mono digits via `font-feature-settings: 'tnum' 1` for hashes/IDs

## Status

Stub. Phase 1.
