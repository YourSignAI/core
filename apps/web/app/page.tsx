import Link from 'next/link';
import { WalletButton } from './components/wallet-button';
import { Wordmark } from './components/wordmark';
import { PDFDropzone } from './components/pdf-dropzone';

export default function HomePage() {
  return (
    <main>
      <header className="lp-nav">
        <Link href="/" aria-label="Home">
          <Wordmark />
        </Link>
        <nav className="links" aria-label="Principal">
          <a href="#how">Como funciona</a>
          <a href="https://verify.yoursign.tech">Verificar</a>
          <a href="https://github.com/YourSignAI/core">Open-source</a>
        </nav>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <WalletButton />
          <Link href="/agents" className="btn btn-secondary" style={{ padding: '10px 16px' }}>
            Delegar agente
          </Link>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-eyebrow">
          <span className="pill-solana"><span className="dot" />Powered by Solana</span>
          <span className="eyebrow" style={{ fontSize: 11 }}>
            Assinatura criptográfica · Custo zero · Agentes sob controle
          </span>
        </div>

        <h1 className="lp-h1">
          Faça o upload do seu contrato e assine de forma <em>criptográfica</em> em segundos.
        </h1>
        <p className="lp-sub">
          Chave pública Solana, hash SHA-256 ancorado on-chain, sem taxa de gás. E delegue tarefas a
          um agente de IA com escopo e prazo — tudo revogável on-chain.
        </p>

        <PDFDropzone />

        <div className="trust-row">
          <TrustItem label="Zero taxa de gás" />
          <TrustItem label="Hash imutável on-chain" />
          <TrustItem label="Sem cadastro inicial" />
          <TrustItem label="Validade jurídica MP 2.200-2" />
        </div>
      </section>

      <section className="lp-how" id="how">
        <div className="lp-how-inner">
          <h2 className="lp-how-h">Três passos. Nenhum cartão de crédito.</h2>
          <div className="lp-steps">
            <Step
              num="01 — UPLOAD"
              title="Solte o PDF, deixe a gente ler."
              body="OCR detecta automaticamente onde a assinatura, rubrica e data devem ir. Você ajusta o que quiser arrastando blocos."
            />
            <Step
              num="02 — IDENTIDADE"
              title="Conecte uma carteira ou faça login com email."
              body="Phantom, Backpack, Solflare — ou login social que cria uma carteira invisível. Você nunca precisa ver uma seed phrase."
            />
            <Step
              num="03 — ASSINATURA"
              title="Aprove uma mensagem off-chain."
              body="YourSign gera um hash SHA-256 do conteúdo, você assina com sua chave Solana e a prova fica imutável on-chain via Light Protocol."
            />
          </div>
        </div>
      </section>

      <footer className="lp-foot">
        <span>© 2026 YourSign Labs · Apache-2.0</span>
        <span>Validade jurídica · Auditoria pública · ICP-Brasil opcional</span>
      </footer>
    </main>
  );
}

function TrustItem({ label }: { label: string }) {
  return (
    <span className="trust-item">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 8L6 12L14 4" stroke="#128a3a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <article className="lp-step">
      <div className="num">{num}</div>
      <h4>{title}</h4>
      <p>{body}</p>
    </article>
  );
}
