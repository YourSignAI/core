'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { setLocale } from '../_actions/set-locale';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '../../i18n/locales';

export function LanguageSwitcher() {
  const current = useLocale() as Locale;
  const t = useTranslations('nav');
  const [pending, startTransition] = useTransition();

  function onChange(next: Locale) {
    if (next === current) return;
    startTransition(() => {
      void setLocale(next);
    });
  }

  return (
    <label
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
    >
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {t('language')}
      </span>
      <select
        aria-label={t('language')}
        value={current}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as Locale)}
        style={{
          appearance: 'none',
          border: '1px solid var(--hairline)',
          borderRadius: 6,
          background: 'var(--canvas)',
          color: 'var(--ink)',
          padding: '6px 10px',
          fontSize: 13,
          cursor: pending ? 'wait' : 'pointer',
        }}
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_LABELS[loc]}
          </option>
        ))}
      </select>
    </label>
  );
}
