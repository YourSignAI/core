import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { WalletButton } from './components/wallet-button';
import { Wordmark } from './components/wordmark';
import { PDFDropzone } from './components/pdf-dropzone';
import { LanguageSwitcher } from './components/language-switcher';

export default function HomePage() {
  const t = useTranslations();
  return (
    <main>
      <header className="lp-nav">
        <Link href="/" aria-label={t('nav.ariaHome')}>
          <Wordmark />
        </Link>
        <nav className="links" aria-label={t('nav.ariaPrincipal')}>
          <a href="#how">{t('nav.howItWorks')}</a>
          <a href="https://verify.yoursign.tech">{t('nav.verify')}</a>
          <a href="https://github.com/YourSignAI/core">{t('nav.openSource')}</a>
        </nav>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LanguageSwitcher />
          <WalletButton />
          <Link href="/agents" className="btn btn-secondary" style={{ padding: '10px 16px' }}>
            {t('nav.delegateAgent')}
          </Link>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-eyebrow">
          <span className="pill-solana"><span className="dot" />{t('home.poweredBy')}</span>
          <span className="eyebrow" style={{ fontSize: 11 }}>
            {t('home.eyebrow')}
          </span>
        </div>

        <h1 className="lp-h1">
          {t('home.h1Lead')} <em>{t('home.h1Em')}</em> {t('home.h1Tail')}
        </h1>
        <p className="lp-sub">{t('home.subtitle')}</p>

        <PDFDropzone />

        <div className="trust-row">
          <TrustItem label={t('home.trust.noGas')} />
          <TrustItem label={t('home.trust.immutableHash')} />
          <TrustItem label={t('home.trust.noSignup')} />
          <TrustItem label={t('home.trust.legalValidity')} />
        </div>
      </section>

      <section className="lp-how" id="how">
        <div className="lp-how-inner">
          <h2 className="lp-how-h">{t('home.how.heading')}</h2>
          <div className="lp-steps">
            <Step
              num={t('home.how.step1.num')}
              title={t('home.how.step1.title')}
              body={t('home.how.step1.body')}
            />
            <Step
              num={t('home.how.step2.num')}
              title={t('home.how.step2.title')}
              body={t('home.how.step2.body')}
            />
            <Step
              num={t('home.how.step3.num')}
              title={t('home.how.step3.title')}
              body={t('home.how.step3.body')}
            />
          </div>
        </div>
      </section>

      <footer className="lp-foot">
        <span>{t('home.footer.left')}</span>
        <span>{t('home.footer.right')}</span>
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
