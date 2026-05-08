'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { canonicalize } from '@yoursign/pdf-engine';

const MAX_BYTES = 25 * 1024 * 1024;

export function PDFDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hover, setHover] = useState(false);

  async function process(file: File) {
    setErr(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErr('Apenas PDF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr('PDF maior que 25 MB.');
      return;
    }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const { hashHex, byteLength } = await canonicalize(buf);
      // Stash hash + filename + base64 bytes in sessionStorage so /sign can
      // pick it up. Demo only — sessionStorage 5 MB cap; PDFs >3.7 MB raw fail.
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
      const b64 = btoa(bin);
      try {
        sessionStorage.setItem(`yoursign:pdf:${hashHex}`, JSON.stringify({
          filename: file.name,
          byteLength,
          hashHex,
          ts: Date.now(),
          b64,
        }));
      } catch {
        // QuotaExceededError — fall back to metadata only; upload step skips.
        sessionStorage.setItem(`yoursign:pdf:${hashHex}`, JSON.stringify({
          filename: file.name,
          byteLength,
          hashHex,
          ts: Date.now(),
        }));
      }
      router.push(`/sign/${hashHex}` as never);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Falha ao processar PDF.');
      setBusy(false);
    }
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void process(f);
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setHover(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void process(f);
  }

  return (
    <>
      <label
        className={`dropzone${hover ? ' is-hover' : ''}${busy ? ' is-loading' : ''}`}
        style={{ display: 'block' }}
        onDragOver={(e) => { e.preventDefault(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={onDrop}
      >
        <div className="dz-content">
          <div className="dz-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V4M12 4L7 9M12 4L17 9" stroke="#222" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 14V18C4 19.1 4.9 20 6 20H18C19.1 20 20 19.1 20 18V14" stroke="#222" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <p className="dz-h">Arraste seu PDF aqui ou clique para selecionar</p>
          <p className="dz-sub">Aceitamos PDFs até 25 MB · Privacidade ponta a ponta</p>
          {busy ? (
            <p className="dz-link" style={{ borderBottom: 0, color: 'var(--rausch)' }}>
              Calculando hash canônico…
            </p>
          ) : (
            <span className="dz-link">Solte o arquivo ou clique aqui</span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onChange}
          disabled={busy}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: busy ? 'wait' : 'pointer',
            zIndex: 2,
          }}
        />
      </label>
      {err ? (
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--error)', textAlign: 'center' }}>
          {err}
        </p>
      ) : null}
    </>
  );
}
