import type { Metadata } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { DelegateForm } from './delegate-form';
import { Wordmark } from '../components/wordmark';
import { WalletButton } from '../components/wallet-button';
import { LanguageSwitcher } from '../components/language-switcher';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('agents.metadata');
  return { title: t('title'), description: t('description') };
}

export default function AgentsPage() {
  const t = useTranslations();
  return (
    <main>
      <header className="lp-nav">
        <Link href="/" aria-label={t('nav.ariaHome')}><Wordmark /></Link>
        <nav className="links" aria-label={t('nav.ariaPrincipal')}>
          <Link href="/">{t('nav.home')}</Link>
          <a href="https://verify.yoursign.tech">{t('nav.verify')}</a>
          <a href="https://github.com/YourSignAI/core">{t('nav.openSource')}</a>
        </nav>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LanguageSwitcher />
          <WalletButton />
        </div>
      </header>

      <section style={{ maxWidth: 720, margin: '0 auto', padding: '64px 32px' }}>
        <div className="lp-eyebrow" style={{ justifyContent: 'flex-start' }}>
          <span className="pill-solana"><span className="dot" />{t('home.poweredBy')}</span>
          <span className="eyebrow">{t('agents.eyebrow')}</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(32px, 4vw, 44px)',
          fontWeight: 700,
          letterSpacing: '-0.8px',
          margin: '0 0 16px',
          textWrap: 'balance',
        }}>
          {t('agents.h1Lead')}{' '}
          <em style={{ fontStyle: 'normal', color: 'var(--rausch)' }}>{t('agents.h1Em')}</em>{' '}
          {t('agents.h1Tail')}
        </h1>
        <p style={{ fontSize: 17, color: 'var(--ash)', maxWidth: 580, margin: '0 0 40px' }}>
          {t('agents.subtitle')}
        </p>

        <div className="surface-card">
          <DelegateForm />
        </div>
      </section>

      <footer className="lp-foot">
        <span>{t('agents.footer.left')}</span>
        <span>{t('agents.footer.right')}</span>
      </footer>
    </main>
  );
}
