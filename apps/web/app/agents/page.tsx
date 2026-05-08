import Link from 'next/link';
import { DelegateForm } from './delegate-form';
import { Wordmark } from '../components/wordmark';
import { WalletButton } from '../components/wallet-button';

export default function AgentsPage() {
  return (
    <main>
      <header className="lp-nav">
        <Link href="/" aria-label="Home"><Wordmark /></Link>
        <nav className="links" aria-label="Principal">
          <Link href="/">Início</Link>
          <a href="https://verify.yoursign.tech">Verificar</a>
          <a href="https://github.com/YourSignAI/core">Open-source</a>
        </nav>
        <WalletButton />
      </header>

      <section style={{ maxWidth: 720, margin: '0 auto', padding: '64px 32px' }}>
        <div className="lp-eyebrow" style={{ justifyContent: 'flex-start' }}>
          <span className="pill-solana"><span className="dot" />Powered by Solana</span>
          <span className="eyebrow">Agente · Escopo · Revogável on-chain</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(32px, 4vw, 44px)',
          fontWeight: 700,
          letterSpacing: '-0.8px',
          margin: '0 0 16px',
          textWrap: 'balance',
        }}>
          Delegue para um <em style={{ fontStyle: 'normal', color: 'var(--rausch)' }}>agente</em> com escopo on-chain.
        </h1>
        <p style={{ fontSize: 17, color: 'var(--ash)', maxWidth: 580, margin: '0 0 40px' }}>
          Você assinará uma mensagem canônica autorizando o agente. A delegação é registrada on-chain
          e pode ser revogada a qualquer momento.
        </p>

        <div className="surface-card">
          <DelegateForm />
        </div>
      </section>

      <footer className="lp-foot">
        <span>© 2026 YourSign Labs · Apache-2.0</span>
        <span>spec §10 · ADR-0007</span>
      </footer>
    </main>
  );
}
