import { VerifyForm } from './verify-form';

export default function Page() {
  return (
    <main>
      <header style={{
        height: 80, padding: '0 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--hairline)',
      }}>
        <a href="/" className="wordmark" aria-label="Home">
          <span className="wordmark-mark">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 11 L11 3 M8 3 L11 3 L11 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 11 L4.6 9.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          YourSign · verify
        </a>
        <span className="pill-solana"><span className="dot" />Light Protocol</span>
      </header>

      <section style={{ maxWidth: 720, margin: '0 auto', padding: '64px 32px' }}>
        <div style={{ marginBottom: 32 }}>
          <span className="eyebrow">Read-only · Sem backend no caminho</span>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 4vw, 44px)',
            fontWeight: 700,
            letterSpacing: '-0.8px',
            margin: '8px 0 16px',
            textWrap: 'balance',
          }}>
            Verifique uma assinatura YourSign on-chain.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ash)', maxWidth: 580, margin: 0 }}>
            Solte um PDF assinado. O hash canônico é recalculado no seu navegador, e a verificação
            consulta a Solana via RPC público — sem passar pelo nosso backend (AC-5.1.2).
          </p>
        </div>
        <VerifyForm />
      </section>

      <footer className="lp-foot">
        <span>© 2026 YourSign Labs · Apache-2.0</span>
        <span><a href="https://github.com/YourSignAI/core">github.com/YourSignAI/core</a></span>
      </footer>
    </main>
  );
}
