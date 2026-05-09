import Link from 'next/link';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { Wordmark } from '../../components/wordmark';
import { PdfViewer } from './pdf-viewer';

// Force dynamic rendering — Next.js 16 fetch is cached by default and would
// pin a stale on-chain snapshot for the document page.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { id: string };
type DocMeta = {
  documentId: string;
  filename: string;
  canonicalHash: string | null;
  ownerB58: string | null;
  byteLength: number;
  uploadedAt: string | null;
  blobUrl: string;
};

type RegistryOnChain = {
  pda: string;
  documentIdHex: string;
  canonicalHashHex: string;
  ownerB58: string;
  status: number; // 0 Awaiting, 1 Partial, 2 Completed, 3 Declined
  requiredSigners: number;
  completedSigners: number;
  createdAt: string;
};

type AttestationOnChain = {
  pda: string;
  signerB58: string;
  kind: number; // 0 Sign, 1 Decline, 2 NotaryCounterSign
  timestamp: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://yoursign-api.videostreaminginc.workers.dev';
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const PROGRAM_ID_STR = '35RbwNgx9Em28mMLZ6iWzjCnaTd4tD2NWuxrHqR76M8X';
const PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);
const STATUS_NAMES = ['Awaiting', 'Partial', 'Completed', 'Declined'];
const STATUS_COLORS = [
  { bg: '#eef4ff', border: '#c5d4f5', fg: '#1d3d6b' },
  { bg: '#eef4ff', border: '#c5d4f5', fg: '#1d3d6b' },
  { bg: '#eaffe7', border: '#a7e8a7', fg: '#1d6b1d' },
  { bg: '#fff5f5', border: '#f5c6c6', fg: '#8a2222' },
];
const KIND_NAMES = ['Sign', 'Decline', 'NotaryCounterSign'];

function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function fetchMeta(id: string): Promise<DocMeta | null> {
  try {
    const r = await fetch(`${API_URL}/documents/${id}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()) as DocMeta;
  } catch {
    return null;
  }
}

async function fetchOnChain(documentIdHex: string): Promise<{
  registry: RegistryOnChain | null;
  attestations: AttestationOnChain[];
}> {
  try {
    const conn = new Connection(RPC_URL, 'confirmed');
    const documentId = hexToBytes(documentIdHex);
    const [docPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('doc'), Buffer.from(documentId)],
      PROGRAM_ID,
    );
    const docInfo = await conn.getAccountInfo(docPda, 'confirmed');
    let registry: RegistryOnChain | null = null;
    if (docInfo) {
      const data = new Uint8Array(docInfo.data);
      // Layout: 8 disc | 16 doc_id | 32 hash | 32 owner | 16 ws | 8 created |
      //         1 status | 1 req_signers | 1 completed_signers | rest = merkle option
      registry = {
        pda: docPda.toBase58(),
        documentIdHex,
        canonicalHashHex: bytesToHex(data.slice(24, 56)),
        ownerB58: new PublicKey(data.slice(56, 88)).toBase58(),
        createdAt: new Date(
          Number(new DataView(data.buffer, data.byteOffset + 104, 8).getBigInt64(0, true)) * 1000,
        ).toISOString(),
        status: data[112] ?? 0,
        requiredSigners: data[113] ?? 0,
        completedSigners: data[114] ?? 0,
      };
    }
    // memcmp filter at offset 8 = document_id (16 bytes) of SignatureAttestation
    const attsRaw = await conn.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: 8 + 16 + 32 + 64 + 32 + 8 + 1 + 16 },
        { memcmp: { offset: 8, bytes: bs58.encode(documentId) } },
      ],
    });
    const attestations: AttestationOnChain[] = attsRaw.map(({ pubkey, account }) => {
      const d = new Uint8Array(account.data);
      // Layout: 8 disc | 16 doc_id | 32 signer | 64 sig | 32 msg_hash | 8 ts | 1 kind
      const ts = Number(
        new DataView(d.buffer, d.byteOffset + 8 + 16 + 32 + 64 + 32, 8).getBigInt64(0, true),
      );
      return {
        pda: pubkey.toBase58(),
        signerB58: new PublicKey(d.slice(8 + 16, 8 + 16 + 32)).toBase58(),
        kind: d[8 + 16 + 32 + 64 + 32 + 8] ?? 0,
        timestamp: new Date(ts * 1000).toISOString(),
      };
    });
    attestations.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return { registry, attestations };
  } catch {
    return { registry: null, attestations: [] };
  }
}

function shortPub(b58: string): string {
  return `${b58.slice(0, 6)}…${b58.slice(-4)}`;
}

export default async function DocumentPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{32}$/.test(id)) {
    return (
      <main style={{ maxWidth: 720, margin: '64px auto', padding: 32 }}>
        <p>document_id inválido. <Link href="/">Voltar</Link></p>
      </main>
    );
  }
  const [meta, onchain] = await Promise.all([fetchMeta(id), fetchOnChain(id)]);
  const blobUrl = meta?.blobUrl ?? `${API_URL}/documents/${id}/blob`;
  const { registry, attestations } = onchain;
  const statusColor = registry ? STATUS_COLORS[registry.status] ?? STATUS_COLORS[0]! : null;
  const canonicalHashFromChain = registry?.canonicalHashHex ?? meta?.canonicalHash ?? null;
  const signerLink = canonicalHashFromChain ? `/sign/${canonicalHashFromChain}` : null;

  return (
    <main>
      <header className="lp-nav">
        <Link href="/" aria-label="Home"><Wordmark /></Link>
        <nav className="links" aria-label="Principal">
          <Link href="/">Início</Link>
          <a href="https://verify.yoursign.tech">Verificar</a>
        </nav>
        <span className="pill-solana"><span className="dot" />Devnet</span>
      </header>

      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '32px' }}>
        <div className="lp-eyebrow" style={{ justifyContent: 'flex-start' }}>
          <span className="eyebrow">Documento ancorado on-chain</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(24px, 3vw, 32px)',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          margin: '4px 0 24px',
          textWrap: 'balance',
        }}>
          {meta?.filename ?? `Documento ${id.slice(0, 8)}…${id.slice(-4)}`}
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
          gap: 24,
        }}>
          <article style={{
            background: 'var(--cloud)',
            border: '1px solid var(--hairline)',
            borderRadius: 14,
            overflow: 'hidden',
            minHeight: '70vh',
          }}>
            {canonicalHashFromChain ? (
              <PdfViewer
                documentId={id}
                canonicalHashHex={canonicalHashFromChain}
                filename={meta?.filename}
              />
            ) : (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--ash)' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
                  PDF ainda não disponível
                </p>
                <p style={{ fontSize: 13, margin: '8px 0 0' }}>
                  document_id <code style={{ fontFamily: 'var(--font-mono)' }}>{id}</code> está
                  ancorado on-chain mas o blob não chegou ainda. O proprietário pode ter pulado o upload
                  (sessionStorage cheio) ou estar em outra sessão. O hash on-chain segue verificável via Solana Explorer.
                </p>
              </div>
            )}
          </article>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {registry && statusColor ? (
              <div className="surface-card" style={{
                background: statusColor.bg,
                border: `1px solid ${statusColor.border}`,
                color: statusColor.fg,
              }}>
                <div className="eyebrow" style={{ color: statusColor.fg }}>Status on-chain</div>
                <div style={{
                  marginTop: 6,
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 700,
                }}>
                  {STATUS_NAMES[registry.status] ?? '?'} · {registry.completedSigners} / {registry.requiredSigners}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 12 }}>
                  Registrado em {new Date(registry.createdAt).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC
                </p>
              </div>
            ) : (
              <div className="surface-card">
                <div className="eyebrow">Status on-chain</div>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ash)' }}>
                  Registry não encontrado em devnet. Pode ter sido removido ou o RPC está desatualizado.
                </p>
              </div>
            )}

            {registry && registry.status !== 2 && registry.status !== 3 && signerLink ? (
              <div className="surface-card">
                <div className="eyebrow">Faltam {registry.requiredSigners - registry.completedSigners} assinatura(s)</div>
                <p style={{ margin: '6px 0 10px', fontSize: 12, color: 'var(--ash)' }}>
                  Compartilhe esta URL com os assinantes pendentes. Cada um abre, conecta a wallet
                  Solana e clica <strong>Assinar documento</strong>.
                </p>
                <code style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--ink)', wordBreak: 'break-all',
                  background: 'var(--cloud)',
                  padding: 8,
                  borderRadius: 6,
                }}>
                  {signerLink}
                </code>
                <Link
                  href={signerLink}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 10, fontSize: 13 }}
                >
                  Abrir página de assinatura →
                </Link>
              </div>
            ) : null}

            <div className="surface-card">
              <div className="eyebrow">
                Assinaturas ({attestations.length}{registry ? ` / ${registry.requiredSigners}` : ''})
              </div>
              {attestations.length === 0 ? (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ash)' }}>
                  Nenhuma assinatura on-chain ainda.
                </p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {attestations.map((a) => (
                    <li key={a.pda} style={{
                      padding: 8,
                      background: a.kind === 1 ? '#fff5f5' : 'var(--cloud)',
                      borderRadius: 6,
                      fontSize: 11,
                    }}>
                      <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                        {shortPub(a.signerB58)}
                      </code>
                      <span style={{
                        marginLeft: 6,
                        color: a.kind === 1 ? '#8a2222' : '#1d6b1d',
                        fontWeight: 600,
                      }}>
                        {a.kind === 1 ? '✗ Recusou' : '✓ Assinou'}
                      </span>
                      <div style={{ color: 'var(--ash)', marginTop: 2 }}>
                        {new Date(a.timestamp).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC
                        {a.kind > 1 ? ` · ${KIND_NAMES[a.kind] ?? a.kind}` : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="surface-card">
              <div className="eyebrow">Document ID</div>
              <code style={{
                display: 'block', marginTop: 4,
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--ink)', wordBreak: 'break-all',
              }}>{id}</code>
            </div>

            {canonicalHashFromChain ? (
              <div className="surface-card">
                <div className="eyebrow">SHA-256 canônico</div>
                <code style={{
                  display: 'block', marginTop: 4,
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--ink)', wordBreak: 'break-all',
                }}>{canonicalHashFromChain}</code>
                <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--ash)' }}>
                  Recalcule no <a href="https://verify.yoursign.tech" style={{ borderBottom: '1px solid var(--ash)' }}>verifier público</a> pra confirmar bytes batem.
                </p>
              </div>
            ) : null}

            {(registry?.ownerB58 ?? meta?.ownerB58) ? (
              <div className="surface-card">
                <div className="eyebrow">Proprietário</div>
                <code style={{
                  display: 'block', marginTop: 4,
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--ink)', wordBreak: 'break-all',
                }}>{registry?.ownerB58 ?? meta?.ownerB58}</code>
              </div>
            ) : null}

            <div className="surface-card">
              <div className="eyebrow">On-chain</div>
              {registry ? (
                <a
                  href={`https://explorer.solana.com/address/${registry.pda}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                  style={{ width: '100%', marginTop: 8, fontSize: 13 }}
                >
                  Registry account →
                </a>
              ) : null}
              <a
                href={`https://explorer.solana.com/address/${PROGRAM_ID_STR}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
                style={{ width: '100%', marginTop: 8, fontSize: 13 }}
              >
                Programa YourSign →
              </a>
              {meta ? (
                <a
                  href={blobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: 8, fontSize: 13 }}
                  download={meta.filename}
                >
                  Baixar PDF
                </a>
              ) : null}
            </div>

            <div style={{
              background: '#fffbe9',
              border: '1px solid #f5e1a7',
              color: '#6b4f00',
              borderRadius: 10,
              padding: 12,
              fontSize: 12,
            }}>
              <strong>Privacy v0.1:</strong> blob cifrado em R2 com AES-256-GCM (chave derivada do
              hash canônico). Server cego ao plaintext. v1.1 ativa per-recipient X25519 wraps —
              só wallets explicitamente listadas decifram.
            </div>
          </aside>
        </div>
      </section>

      <footer className="lp-foot">
        <span>© 2026 YourSign Labs · Apache-2.0</span>
        <span>spec §1 · §3 · §5</span>
      </footer>
    </main>
  );
}
