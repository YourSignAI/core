'use client';

import { useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { canonicalize } from '@yoursign/pdf-engine';

const PROGRAM_ID = new PublicKey('35RbwNgx9Em28mMLZ6iWzjCnaTd4tD2NWuxrHqR76M8X');
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const CLUSTER = 'devnet';

type Match = {
  registryPda: string;
  documentIdHex: string;
  ownerB58: string;
  workspaceIdHex: string;
  createdAt: string;
  status: string;
  requiredSigners: number;
  completedSigners: number;
};

type Result =
  | { kind: 'searching'; filename: string; byteLength: number; hashHex: string }
  | { kind: 'no_record'; filename: string; byteLength: number; hashHex: string }
  | { kind: 'found'; filename: string; byteLength: number; hashHex: string; match: Match };

const STATUS_NAMES = ['Awaiting', 'Partial', 'Completed', 'Declined'];

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function findOnChain(hashHex: string): Promise<Match | null> {
  const conn = new Connection(RPC, 'confirmed');
  const hashBytes = hexToBytes(hashHex);
  // Anchor account layout for DocumentRegistry:
  //   0..8   discriminator
  //   8..24  document_id [u8;16]
  //   24..56 canonical_hash [u8;32]
  //   56..88 owner Pubkey
  //   88..104 workspace_id [u8;16]
  //   104..112 created_at i64
  //   112    status enum (1)
  //   113    required_signers u8
  //   114    completed_signers u8
  //   115..  merkle_root Option<[u8;32]>
  const accounts = await conn.getProgramAccounts(PROGRAM_ID, {
    filters: [{ memcmp: { offset: 24, bytes: bs58.encode(hashBytes) } }],
  });
  if (accounts.length === 0) return null;
  const { pubkey, account } = accounts[0]!;
  const data = new Uint8Array(account.data);
  const documentId = data.slice(8, 24);
  const owner = new PublicKey(data.slice(56, 88));
  const workspaceId = data.slice(88, 104);
  const createdAt = new DataView(data.buffer, data.byteOffset + 104, 8).getBigInt64(0, true);
  const statusByte = data[112] ?? 0;
  return {
    registryPda: pubkey.toBase58(),
    documentIdHex: bytesToHex(documentId),
    ownerB58: owner.toBase58(),
    workspaceIdHex: bytesToHex(workspaceId),
    createdAt: new Date(Number(createdAt) * 1000).toISOString(),
    status: STATUS_NAMES[statusByte] ?? `unknown(${statusByte})`,
    requiredSigners: data[113] ?? 0,
    completedSigners: data[114] ?? 0,
  };
}

export function VerifyForm() {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const buf = await file.arrayBuffer();
      const { hashHex, byteLength } = await canonicalize(buf);
      setResult({ kind: 'searching', filename: file.name, byteLength, hashHex });
      const match = await findOnChain(hashHex);
      if (match) {
        setResult({ kind: 'found', filename: file.name, byteLength, hashHex, match });
      } else {
        setResult({ kind: 'no_record', filename: file.name, byteLength, hashHex });
      }
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
          hash calculado no navegador, on-chain via RPC público — sem nosso backend
        </p>
        <input
          type="file"
          accept="application/pdf"
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
      </label>

      {busy ? (
        <p style={{ fontSize: 13, color: 'var(--ash)', textAlign: 'center', margin: 0 }}>
          {result?.kind === 'searching' ? 'Buscando registro on-chain…' : 'Calculando hash canônico…'}
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

          {result.kind === 'no_record' ? (
            <div style={{
              marginTop: 16, padding: 12,
              background: '#fff5f5', border: '1px solid #f5c6c6',
              borderRadius: 8, fontSize: 13, color: '#8a2222',
            }}>
              ✗ Hash não encontrado no programa devnet. PDF não foi ancorado on-chain
              ou bytes diferem da versão registrada.
            </div>
          ) : null}

          {result.kind === 'found' ? (
            <>
              <div style={{
                marginTop: 16, padding: 12,
                background: '#eaffe7', border: '1px solid #a7e8a7',
                borderRadius: 8, fontSize: 13, color: '#1d6b1d',
              }}>
                ✓ Documento encontrado on-chain. Hash bate com o registro.
              </div>
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <Field label="Status" value={result.match.status} />
                <Field label="Document ID" value={result.match.documentIdHex} />
                <Field label="Proprietário" value={result.match.ownerB58} />
                <Field label="Registry PDA" value={result.match.registryPda} />
                <Field
                  label="Criado em"
                  value={new Date(result.match.createdAt).toLocaleString('pt-BR', { timeZone: 'UTC' }) + ' UTC'}
                />
                <Field
                  label="Assinaturas"
                  value={`${result.match.completedSigners} / ${result.match.requiredSigners}`}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <a
                  href={`https://explorer.solana.com/address/${result.match.registryPda}?cluster=${CLUSTER}`}
                  target="_blank"
                  rel="noreferrer"
                  className="dropzone"
                  style={{
                    padding: '10px 16px', borderRadius: 8, border: '1px solid var(--ink)',
                    background: 'var(--canvas)', color: 'var(--ink)',
                    fontSize: 13, fontWeight: 500,
                  }}
                >
                  Solana Explorer →
                </a>
                <a
                  href={`https://yoursign-web.videostreaminginc.workers.dev/d/${result.match.documentIdHex}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '10px 16px', borderRadius: 8,
                    background: 'var(--rausch)', color: '#fff',
                    fontSize: 13, fontWeight: 500,
                    display: 'inline-block',
                  }}
                >
                  Abrir documento →
                </a>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <code style={{
        display: 'block', marginTop: 2,
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--ink)', wordBreak: 'break-all',
      }}>{value}</code>
    </div>
  );
}
