import Link from 'next/link';
import { Wordmark } from '../../components/wordmark';
import { WalletButton } from '../../components/wallet-button';
import { SignFlow } from './sign-flow';

type Params = { hash: string };

export default async function SignPage({ params }: { params: Promise<Params> }) {
  const { hash } = await params;
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    return (
      <main style={{ maxWidth: 720, margin: '64px auto', padding: 32 }}>
        <p>Hash inválido. <Link href="/">Voltar</Link></p>
      </main>
    );
  }
  return (
    <main>
      <header className="lp-nav">
        <Link href="/" aria-label="Home"><Wordmark /></Link>
        <nav className="links" aria-label="Principal">
          <Link href="/">Início</Link>
          <a href="https://verify.yoursign.tech">Verificar</a>
        </nav>
        <WalletButton />
      </header>

      <section style={{ maxWidth: 720, margin: '0 auto', padding: '64px 32px' }}>
        <div className="lp-eyebrow" style={{ justifyContent: 'flex-start' }}>
          <span className="pill-solana"><span className="dot" />Solana devnet</span>
          <span className="eyebrow">Etapa 1 · Ancorar hash on-chain</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 700,
          letterSpacing: '-0.6px',
          margin: '0 0 16px',
        }}>
          Registrar PDF on-chain
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ash)', margin: '0 0 32px' }}>
          Conecte sua carteira Solana e assine a transação.
          O hash SHA-256 fica anchored on-chain via instrução{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>register_document</code>.
        </p>

        <SignFlow hashHex={hash} />
      </section>

      <footer className="lp-foot">
        <span>© 2026 YourSign Labs · Apache-2.0</span>
        <span>spec AC-1.2.2 · ADR-0002</span>
      </footer>
    </main>
  );
}
