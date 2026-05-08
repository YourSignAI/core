import type { Metadata } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Wordmark } from '../../components/wordmark';
import { WalletButton } from '../../components/wallet-button';
import { LanguageSwitcher } from '../../components/language-switcher';
import { SignFlow } from './sign-flow';

type Params = { hash: string };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('sign.metadata');
  return { title: t('title'), description: t('description') };
}

function InvalidHash() {
  const t = useTranslations('sign');
  return (
    <main style={{ maxWidth: 720, margin: '64px auto', padding: 32 }}>
      <p>{t('invalidHash')} <Link href="/">{t('back')}</Link></p>
    </main>
  );
}

export default async function SignPage({ params }: { params: Promise<Params> }) {
  const { hash } = await params;
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    return <InvalidHash />;
  }
  const t = await getTranslations();
  return (
    <main>
      <header className="lp-nav">
        <Link href="/" aria-label={t('nav.ariaHome')}><Wordmark /></Link>
        <nav className="links" aria-label={t('nav.ariaPrincipal')}>
          <Link href="/">{t('nav.home')}</Link>
          <a href="https://verify.yoursign.tech">{t('nav.verify')}</a>
        </nav>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LanguageSwitcher />
          <WalletButton />
        </div>
      </header>

      <section style={{ maxWidth: 720, margin: '0 auto', padding: '64px 32px' }}>
        <div className="lp-eyebrow" style={{ justifyContent: 'flex-start' }}>
          <span className="pill-solana"><span className="dot" />{t('sign.cluster')}</span>
          <span className="eyebrow">{t('sign.eyebrow')}</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 700,
          letterSpacing: '-0.6px',
          margin: '0 0 16px',
        }}>
          {t('sign.h1')}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ash)', margin: '0 0 32px' }}>
          {t.rich('sign.subtitle', {
            instruction: () => (
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>register_document</code>
            ),
          })}
        </p>

        <SignFlow hashHex={hash} />
      </section>

      <footer className="lp-foot">
        <span>{t('sign.footer.left')}</span>
        <span>{t('sign.footer.right')}</span>
      </footer>
    </main>
  );
}
