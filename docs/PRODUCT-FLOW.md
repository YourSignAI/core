# YourSign — Fluxo de Produto e Cenários

> Documento para alinhar sócio + diretor de produto sobre o que está deployed,
> como funciona e quais cenários cobre.
>
> **Status**: devnet live. Pré-mainnet. 5 URLs Cloudflare em produção.

---

## TL;DR

YourSign é um produto de **assinatura de documentos descentralizada**:
o usuário sobe um PDF, o **hash criptográfico** desse PDF fica registrado
**on-chain na Solana**, e qualquer pessoa pode **verificar a integridade
sem depender dos nossos servidores**.

Diferencial: a verificação é **pública, sem custódia, sem cadastro** —
o auditor (juiz, RH, fiscal) confere direto contra a blockchain.

---

## Personagens

| Papel | Quem é | O que faz |
| ----- | ------ | --------- |
| **Owner** | Quem envia o documento | Sobe PDF, aprova transação, compartilha URL |
| **Recipient** | Quem precisa ler/assinar | Abre URL pública, vê PDF + prova on-chain |
| **Auditor** | Terceiro independente | Confere hash do PDF contra a blockchain |

---

## URLs em produção (devnet · staging)

| Serviço | URL |
| ------- | --- |
| App principal | https://yoursign.tech |
| Verificador público | https://yoursign-verifier.videostreaminginc.workers.dev |
| API | https://yoursign-api.videostreaminginc.workers.dev |
| MCP server (agentes IA) | https://yoursign-mcp.videostreaminginc.workers.dev |
| Programa Solana | https://explorer.solana.com/address/35RbwNgx9Em28mMLZ6iWzjCnaTd4tD2NWuxrHqR76M8X?cluster=devnet |

DNS de `verify.yoursign.tech`, `api.yoursign.tech`, `mcp.yoursign.tech`
ainda precisa ser cutoverado no Cloudflare (tarefa de 1min cada).

---

## Cenário principal — "Mariana envia contrato pra Léo assinar"

### Etapa 1 · Owner sobe o PDF

```
Mariana → yoursign.tech
  ├─ Drag o PDF de contrato (até 25 MB)
  ├─ Browser calcula SHA-256 canônico do conteúdo
  ├─ Hash + arquivo ficam no sessionStorage do navegador
  └─ Redireciona pra /sign/<hash>
```

Por que isso importa: **o hash sai do navegador da Mariana, não do nosso
servidor.** Garante que se houver tampering depois, qualquer pessoa percebe.

### Etapa 2 · Conectar carteira

A Mariana tem 2 caminhos:

| Tipo | Como | UX |
| ---- | ---- | -- |
| **Crypto-native** | Phantom, Backpack, Solflare | Click "Conectar" → escolhe wallet |
| **Mainstream** | Email, Google, Apple via Privy | Login social → carteira invisível criada automaticamente |

A carteira invisível (Privy embedded) é o **diferencial**: usuário comum
nunca vê seed phrase, mas tem chave Solana real (MPC distribuído entre
device + Privy + recovery).

### Etapa 3 · Aprovar transação on-chain

```
Mariana clica "Ancorar hash on-chain"
  ├─ Browser monta transação Solana com:
  │  ├─ Hash SHA-256 (32 bytes)
  │  ├─ Document ID (ULID)
  │  ├─ Workspace ID
  │  └─ Owner pubkey (a Mariana)
  ├─ Wallet popup pede aprovação
  ├─ Mariana confirma
  ├─ Transação confirma em ~400ms
  └─ Custo total: ~$0.0006 (≈ 0.003 SOL — rent + fee)
```

Resultado:
- ✓ Hash imutável on-chain (programa YourSign)
- ✓ PDF original armazenado no R2 (storage Cloudflare) — demo plaintext, Sprint 2 cifra
- ✓ UI mostra: tx signature, document_id, link Solana Explorer

### Etapa 4 · Compartilhar com Léo

```
UI exibe: "Compartilhe: https://yoursign.tech/d/019e096d..."
Mariana copia → manda pro Léo via email/whatsapp/qualquer canal
```

### Etapa 5 · Léo abre o documento

```
Léo → yoursign.tech/d/019e096d... (sem precisar de login)
  ├─ Esquerda: PDF renderizado inline no browser
  └─ Direita:
     ├─ Document ID
     ├─ SHA-256 canônico
     ├─ Proprietário (pubkey da Mariana)
     ├─ Botão "Baixar PDF"
     └─ Botão "Programa YourSign no Solana Explorer"
```

Léo lê o contrato. Não precisa de conta, não baixa app, não cria senha.

### Etapa 6 · Auditor independente verifica

Cenário típico: ano que vem, em uma disputa judicial, o juiz quer
**confirmar que o contrato apresentado é o original**.

```
Juiz → yoursign-verifier.videostreaminginc.workers.dev
  ├─ Drag o PDF (qualquer cópia byte-idêntica)
  ├─ Browser calcula SHA-256 local
  ├─ Browser consulta Solana RPC público (não nosso)
  ├─ Encontra o registro on-chain pelo hash
  └─ Mostra:
     ✓ "Documento encontrado on-chain"
     ├─ Status (Awaiting / Partial / Completed / Declined)
     ├─ Owner que registrou
     ├─ Quando foi registrado (timestamp on-chain)
     ├─ Link pro Solana Explorer
     └─ Link pro render do documento
```

**O servidor da YourSign poderia estar OFFLINE pra sempre — a verificação
funciona igual.** Esse é o ponto.

---

## Diagrama do fluxo

```
┌──────────┐    sobe    ┌────────────────┐   ancora   ┌──────────────┐
│  OWNER   │───PDF────▶ │ yoursign.tech  │───tx────▶  │   Solana     │
│ Mariana  │            │   /sign/<hash> │            │   devnet     │
│ Privy/   │            │                │            │  register_   │
│ Phantom  │            └───────┬────────┘            │  document    │
└──────────┘                    │                     └──────┬───────┘
                                ▼                            ▼
                         ┌────────────┐              ┌────────────────┐
                         │  Cloudflare│              │ DocumentRegistry│
                         │  R2 (PDF)  │              │  PDA imutável   │
                         └─────┬──────┘              └────┬───────────┘
                               │                          │
                  ┌────────────┴────┐    ┌────────────────┴───┐
                  │                 │    │                    │
                  ▼                 ▼    ▼                    ▼
            ┌──────────┐   ┌────────────────┐         ┌─────────────┐
            │ RECIPIENT│   │    AUDITOR     │         │  Solana     │
            │  Léo     │   │  Juiz / RH     │         │  Explorer   │
            │ /d/<id>  │   │ verify.app     │         │  qualquer   │
            │ lê PDF   │   │ confere hash   │         │  pessoa     │
            │ + prova  │   │ vs on-chain    │         │             │
            └──────────┘   └────────────────┘         └─────────────┘
```

---

## Cenários que cobrimos hoje

### ✅ Cenário A — Contrato simples assinado pela Mariana

Mariana sobe PDF → ancora → manda pro Léo → Léo abre URL → Léo lê.
**Status: completo, demonstrável.**

### ✅ Cenário B — Auditor independente verifica integridade

Juiz/auditor recebe PDF anos depois → drag no verifier → confirma hash on-chain.
**Status: completo. Diferencial vs. DocuSign — eles dependem do servidor deles.**

### ✅ Cenário C — Login sem seed phrase

Pessoa não-cripto faz login com email/Google/Apple → carteira embedded
criada automaticamente → usa o produto.
**Status: completo via Privy MPC.**

### ✅ Cenário D — Detecção de tampering

Alguém adultera o PDF (muda 1 byte) → sobe no verifier → "✗ Hash não encontrado".
**Status: completo, defesa por design.**

### 🟡 Cenário E — Léo co-assina

Léo abre URL → conecta wallet → assina o contrato → on-chain registra
duas assinaturas → status "Completed".
**Status: BLOQUEADO. Programa Solana ainda não tem instrução `attest_signature`.
Próxima sprint.**

### 🟡 Cenário F — Multi-party (5 assinantes em um doc)

Owner cria doc com 5 required_signers → URL única → cada signer abre →
todos assinam → audit appendix anexado ao PDF final.
**Status: design pronto (spec §4), não implementado.**

### 🟡 Cenário G — Agente de IA assina por delegação

Mariana delega ao agente Claude com escopo "só sign_document, expira em 24h" →
Claude assina automaticamente → registra on-chain como "agente X sob delegação Y" →
Mariana revoga a qualquer momento.
**Status: design completo (spec §10, ADR-0007), programa tem as instruções,
falta wirar o submit no MCP server.**

### 🔴 Cenário H — Privacidade (recipient cifrado)

Hoje o PDF no R2 é plaintext. Em produção: chave Solana do recipient cifra
o documento via X25519 envelope, só ele decifra no browser.
**Status: design pronto (spec §3, ADR-0004), pacote `@yoursign/crypto` tem
as primitivas, falta wirar no fluxo.**

### 🔴 Cenário I — Pagamento USDC para features premium

Notarização ICP-Brasil, threshold escrow, mais de 5 signatários → cobra USDC
via Solana Pay.
**Status: design pronto (spec §6, ADR-0003), fora do hackathon — descopado.**

### 🔴 Cenário J — Mainnet com multi-sig

Programa em mainnet com upgrade authority de 3-de-5 multi-sig (Squads).
**Status: runbook escrito (`docs/runbooks/MAINNET-DEPLOY.md`), aguardando
sócios + cofounders pra montar multi-sig.**

---

## Tecnologia (resumo executivo)

| Camada | Stack | Por quê |
| ------ | ----- | ------- |
| Frontend | Next.js 16 + Turbopack | App router moderno, SSR rápido |
| Auth | Privy (MPC) + Solana Wallet Adapter | Suporta cripto-native E mainstream |
| Backend | Cloudflare Workers + Hono | Edge global, $0 idle, escala automática |
| Storage docs | Cloudflare R2 | S3-compatible, sem egress fee |
| Storage chave-valor | Cloudflare KV | Sessões SIWS, nonces |
| Blockchain | Solana (devnet → mainnet) | 400ms confirmação, fee ~$0.000005 |
| Programa on-chain | Anchor 0.30.1 (Rust) | Framework padrão Solana |
| Hashing | SHA-256 client-side via Web Crypto | Privacidade — bytes nunca saem do browser na verificação |
| Compressão on-chain | Light Protocol ZK Compression | Reduz custo p/ <$0.001 por atestação |
| MCP (agentes IA) | @modelcontextprotocol/sdk | Padrão Anthropic, integra Claude Desktop |

---

## Diferenciação competitiva

| Concorrente | Limitação | Como YourSign vence |
| ----------- | --------- | ------------------- |
| DocuSign | Servidor deles é a fonte da verdade. Se eles fecharem, contratos viram inverificáveis. | Hash on-chain + verifier público. Solana sobrevive a YourSign. |
| Adobe Sign | Mesmo problema + caro ($25/mês mínimo) | Free tier ilimitado pra self-sign, ~$0.001 por assinatura multi-party |
| Clicksign (Brasil) | Validade jurídica via ICP-Brasil → fechado, vendor lock | Híbrido: criptográfico aberto + ponte ICP-Brasil opcional |
| ZapSign | Sem proof on-chain, sem auditoria pública | Drop o PDF, ver tudo on-chain em segundos |
| Smart contracts puros (BlockSign) | UX horrível, exige seed phrase, fee Ethereum alto | Privy embedded wallet + Solana fee 400× menor |

**Nosso pitch numa frase**: *"DocuSign que sobrevive ao DocuSign."*

---

## Custo unitário

| Item | Custo |
| ---- | ----- |
| Registrar PDF on-chain (Solana devnet hoje, mainnet futuro) | ~0.003 SOL one-time = ~$0.0006 |
| Cloudflare R2 storage (1 GB armazenado) | $0.015/mês |
| Cloudflare R2 reads (10k recipients abrindo doc) | grátis (10M/mês incluso) |
| Worker requests | grátis até 100k/dia, depois $5/M |
| Privy login | grátis até 1000 MAU, depois $0.05/MAU |

**Custo marginal de uma assinatura**: ~$0.001 total.
**Free tier viável**: até 1000 usuários ativos sem custo de infra.

---

## Riscos abertos (transparência total)

1. **Privy é dependência externa** — se quebrarem, fluxo embedded wallet
   para. Mitigação: Wallet Adapter funciona como fallback (Phantom/Backpack).
   ADR-0006 documenta a escolha.
2. **Mainnet ainda não deployed** — multi-sig precisa ser montada com sócios.
   Custo deploy: ~3 SOL (~$600).
3. **PDF plaintext no R2** — Sprint 2 cifra. Hoje é demo only e o banner
   amarelo no UI deixa claro.
4. **Co-signature não implementada** — Cenário E bloqueado até a próxima
   sprint adicionar `attest_signature` no programa.

---

## Status de specs

24 acceptance criteria falsificáveis em `docs/01-spec.md`. Hoje implementados:

- ✅ AC-1.2.1 — PDF canônico estável
- ✅ AC-1.2.2 — Hash logged on-chain
- ✅ AC-2.3.1 — Sem chave privada no servidor (Privy MPC)
- ✅ AC-4.1.2 — Sign off-chain via wallet
- ✅ AC-4.2.1 — Atestação on-chain confirmada (≤5s)
- ✅ AC-4.2.2 — Fee ≤ $0.001 (~$0.000005 medido)
- ✅ AC-5.1.1 — Verifier público funcional
- ✅ AC-5.1.2 — Sem nosso backend na verificação
- 🟡 AC-4.3.1 — Status "Completed" depende de attest_signature (próx sprint)
- 🟡 AC-3.1.* — Encryption (descrito em ADR-0004, primitivas prontas, falta wirar)
- 🔴 AC-6.* — USDC payments (descopado pra pós-Hacktown)

---

## Próximos passos sugeridos (em ordem de impacto)

1. **Custom domains** — DNS de `verify`, `api`, `mcp` no Cloudflare (1min cada).
   Aumenta credibilidade no demo.
2. **`attest_signature` ix** — destrava cenário E (co-signature). ~3h.
3. **Audit appendix** — última página do PDF baixado mostra hash + tx Solana.
   Premium UX pro demo. ~2h.
4. **Mainnet deploy** — multi-sig 3-de-5. Tarefa logística + 3 SOL.
5. **X25519 envelope encryption** — sai de "demo plaintext" pra produção.
   1 sprint.
6. **Agente IA E2E** — destrava cenário G, demo Hacktown 90s funciona inteiro.

---

## Onde olhar pra cada coisa

| Tema | Arquivo |
| ---- | ------- |
| Spec falsificável | `docs/01-spec.md` |
| Arquitetura técnica | `docs/02-architecture.md` |
| Decisões (ADRs) | `docs/adr/` |
| Programa on-chain | `programs/yoursign/src/lib.rs` |
| Build instruction | `packages/solana-sdk/src/instructions.ts` |
| Fluxo upload | `apps/web/app/components/pdf-dropzone.tsx` |
| Fluxo sign | `apps/web/app/sign/[hash]/sign-flow.tsx` |
| Render documento | `apps/web/app/d/[id]/page.tsx` |
| Verifier | `apps/verifier/app/verify-form.tsx` |
| API | `apps/api/src/routes/` |
| Sprints | `docs/05-sprints/` |
| Runbooks deploy | `docs/runbooks/` |

---

## TL;DR pro pitch

> "Faça upload do contrato, conecte sua carteira ou logue com email,
> aprove a transação. O hash do PDF fica gravado pra sempre na Solana —
> custou menos de 1 centavo. Compartilhe a URL com qualquer pessoa.
> Anos depois, qualquer auditor confere a integridade direto na blockchain
> sem precisar de nós. Funciona até se nossa empresa fechar."

— Pra Hacktown / Colosseum: o produto **funciona end-to-end na devnet**,
o programa **está deployed**, a verificação **é pública e independente**,
e o **diferencial vs. DocuSign é demonstrável em 30 segundos**.
