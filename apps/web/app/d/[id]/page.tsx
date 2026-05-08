import Link from 'next/link';
import { Wordmark } from '../../components/wordmark';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://yoursign-api.videostreaminginc.workers.dev';
const PROGRAM_ID = '35RbwNgx9Em28mMLZ6iWzjCnaTd4tD2NWuxrHqR76M8X';

async function fetchMeta(id: string): Promise<DocMeta | null> {
  try {
    const r = await fetch(`${API_URL}/documents/${id}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()) as DocMeta;
  } catch {
    return null;
  }
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
  const meta = await fetchMeta(id);
  const blobUrl = meta?.blobUrl ?? `${API_URL}/documents/${id}/blob`;

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
            {meta ? (
              <embed
                src={blobUrl}
                type="application/pdf"
                style={{ width: '100%', height: '70vh', display: 'block' }}
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
            <div className="surface-card">
              <div className="eyebrow">Document ID</div>
              <code style={{
                display: 'block', marginTop: 4,
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--ink)', wordBreak: 'break-all',
              }}>{id}</code>
            </div>

            {meta?.canonicalHash ? (
              <div className="surface-card">
                <div className="eyebrow">SHA-256 canônico</div>
                <code style={{
                  display: 'block', marginTop: 4,
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--ink)', wordBreak: 'break-all',
                }}>{meta.canonicalHash}</code>
                <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--ash)' }}>
                  Recalcule no <a href="https://verify.yoursign.tech" style={{ borderBottom: '1px solid var(--ash)' }}>verifier público</a> pra confirmar bytes batem.
                </p>
              </div>
            ) : null}

            {meta?.ownerB58 ? (
              <div className="surface-card">
                <div className="eyebrow">Proprietário</div>
                <code style={{
                  display: 'block', marginTop: 4,
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--ink)', wordBreak: 'break-all',
                }}>{meta.ownerB58}</code>
              </div>
            ) : null}

            <div className="surface-card">
              <div className="eyebrow">On-chain</div>
              <a
                href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`}
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
              <strong>Demo only:</strong> blob é plaintext em R2. Sprint 2 wireá X25519 envelope
              encryption (AC-3.1.2) — só destinatários com chave Solana certa decifram.
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
