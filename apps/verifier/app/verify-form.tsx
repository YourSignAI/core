'use client';

import { useState } from 'react';
import { canonicalize } from '@yoursign/pdf-engine';

type VerifyResult = {
  filename: string;
  hashHex: string;
  byteLength: number;
  status: 'searching' | 'no_record' | 'awaiting_chain';
};

export function VerifyForm() {
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
      // Sprint 3 Thursday: Light Protocol RPC read for DocumentRegistry +
      // SignatureAttestation + AgentAction. Then Ed25519 verify each sig
      // client-side via @yoursign/crypto. For now: surface the hash so the user
      // can confirm the canonical hash matches what the platform recorded.
      setResult((prev) => (prev ? { ...prev, status: 'awaiting_chain' } : prev));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'falha desconhecida');
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
          Solte um PDF assinado aqui
        </p>
        <p style={{ fontSize: 13, color: 'var(--ash)', margin: 0 }}>
          ou clique para selecionar — o hash é calculado no seu navegador
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
          Calculando hash canônico…
        </p>
      ) : null}
      {err ? <p style={{ fontSize: 13, color: 'var(--error)', margin: 0 }}>{err}</p> : null}

      {result ? (
        <div className="surface">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>{result.filename}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ash)' }}>{result.byteLength} bytes</div>
          <div style={{ marginTop: 16 }}>
            <div className="eyebrow">SHA-256</div>
            <code style={{
              display: 'block', marginTop: 4,
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--ink)', wordBreak: 'break-all',
            }}>{result.hashHex}</code>
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--ash)' }}>
            Status:{' '}
            <span style={{ color: 'var(--ink)' }}>
              {result.status === 'awaiting_chain'
                ? 'aguardando consulta on-chain (Sprint 3 Thursday liga Light Protocol read)'
                : result.status}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
