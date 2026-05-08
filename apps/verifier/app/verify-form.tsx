'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { canonicalize } from '@yoursign/pdf-engine';

type VerifyResult = {
  filename: string;
  hashHex: string;
  byteLength: number;
  status: 'searching' | 'no_record' | 'awaiting_chain';
};

export function VerifyForm() {
  const t = useTranslations('form');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const buf = await file.arrayBuffer();
      const { hashHex, byteLength } = await canonicalize(buf);
      setResult({ filename: file.name, hashHex, byteLength, status: 'searching' });
      setResult((prev) => (prev ? { ...prev, status: 'awaiting_chain' } : prev));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t('errorUnknown'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <label className="dropzone">
        <div className="dz-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 16V4M12 4L7 9M12 4L17 9" stroke="#222" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 14V18C4 19.1 4.9 20 6 20H18C19.1 20 20 19.1 20 18V14" stroke="#222" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: '0 0 4px' }}>
          {t('dropHeadline')}
        </p>
        <p style={{ fontSize: 13, color: 'var(--ash)', margin: 0 }}>
          {t('dropSubline')}
        </p>
        <input
          type="file"
          accept="application/pdf"
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
      </label>

      {busy ? (
        <p style={{ fontSize: 13, color: 'var(--ash)', textAlign: 'center', margin: 0 }}>
          {t('computing')}
        </p>
      ) : null}
      {err ? <p style={{ fontSize: 13, color: 'var(--error)', margin: 0 }}>{err}</p> : null}

      {result ? (
        <div className="surface">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>{result.filename}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ash)' }}>
            {t('result.bytes', { count: result.byteLength })}
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="eyebrow">{t('result.sha256')}</div>
            <code style={{
              display: 'block', marginTop: 4,
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--ink)', wordBreak: 'break-all',
            }}>{result.hashHex}</code>
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--ash)' }}>
            {t('result.statusLabel')}{' '}
            <span style={{ color: 'var(--ink)' }}>
              {result.status === 'awaiting_chain'
                ? t('result.awaitingChain')
                : result.status}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
