'use client';

import { useEffect, useRef, useState } from 'react';
import { deriveConvergentDek, open } from '@yoursign/crypto';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://yoursign-api.videostreaminginc.workers.dev';

type Props = {
  documentId: string;
  canonicalHashHex: string;
  filename?: string;
};

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function PdfViewer({ documentId, canonicalHashHex, filename }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const r = await fetch(`${API_URL}/documents/${documentId}/blob`, { cache: 'no-store' });
        if (!r.ok) {
          if (!cancelled) {
            setError('Blob not yet uploaded.');
            setLoading(false);
          }
          return;
        }
        const framed = new Uint8Array(await r.arrayBuffer());
        // Legacy plaintext blobs (uploaded before convergent encryption) start
        // with `%PDF-` magic. Detect and skip decryption for backward-compat.
        const looksLikePlainPdf =
          framed.length > 5 &&
          framed[0] === 0x25 && framed[1] === 0x50 &&
          framed[2] === 0x44 && framed[3] === 0x46 && framed[4] === 0x2d;

        let plaintext: Uint8Array;
        if (looksLikePlainPdf) {
          plaintext = framed;
        } else {
          if (framed.length < 12 + 16) throw new Error('encrypted blob too short');
          const iv = framed.slice(0, 12);
          const ciphertext = framed.slice(12);
          const dek = deriveConvergentDek(hexToBytes(canonicalHashHex));
          plaintext = open({ ciphertext, iv }, dek);
        }

        if (cancelled) return;
        const blob = new Blob([plaintext as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = url;
        setBlobUrl(url);
        setLoading(false);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'failed to decrypt blob');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = null;
      }
    };
  }, [documentId, canonicalHashHex]);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--ash)' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
          Decrypting document…
        </p>
        <p style={{ fontSize: 13, margin: '8px 0 0' }}>
          Ciphertext is fetched from R2 and decrypted in your browser. The server never sees the plaintext.
        </p>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--ash)' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
          {error ?? 'PDF unavailable'}
        </p>
        <p style={{ fontSize: 13, margin: '8px 0 0' }}>
          The on-chain registry exists but the encrypted blob has not arrived yet
          (owner may have skipped upload or stayed in another session).
          The on-chain hash is still verifiable via Solana Explorer.
        </p>
      </div>
    );
  }

  return (
    <embed
      src={blobUrl}
      type="application/pdf"
      title={filename}
      style={{ width: '100%', height: '70vh', display: 'block' }}
    />
  );
}
