'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { usePrivy } from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
} from '@privy-io/react-auth/solana';
import bs58 from 'bs58';
import { PublicKey, SystemProgram, Transaction, type Connection as Conn } from '@solana/web3.js';
import {
  registerDocumentIx,
  attestSignatureIx,
  AttestationKind,
  canonicalSigningMessage,
  newDocumentId,
  hexToBytes,
  bytesToHex,
  signatureAttestationPda,
  PROGRAM_ID,
  TREASURY_PUBKEY,
  REGISTER_DOCUMENT_FEE_LAMPORTS,
  ATTEST_SIGNATURE_FEE_LAMPORTS,
} from '@yoursign/solana-sdk';

type StashedFile = {
  filename: string;
  byteLength: number;
  hashHex: string;
  ts: number;
  b64?: string;
};

type RegistrySnapshot = {
  pda: PublicKey;
  documentId: Uint8Array;
  documentIdHex: string;
  ownerB58: string;
  status: number; // 0=Awaiting 1=Partial 2=Completed 3=Declined
  requiredSigners: number;
  completedSigners: number;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'building' }
  | { kind: 'awaiting-wallet' }
  | { kind: 'confirming'; signature: string }
  | { kind: 'done'; signature: string; documentIdHex: string }
  | { kind: 'error'; reason: string };

const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet';
const WORKSPACE_ID_HEX = '00000000000000000000000000000001';
const PRIVY_CHAIN: 'solana:devnet' | 'solana:mainnet' | 'solana:testnet' =
  CLUSTER === 'mainnet-beta' ? 'solana:mainnet' :
  CLUSTER === 'testnet' ? 'solana:testnet' : 'solana:devnet';
const STATUS_NAMES = ['Awaiting', 'Partial', 'Completed', 'Declined'];

type ActiveWallet = {
  source: 'privy' | 'adapter';
  pubkey: PublicKey;
  send: (tx: Transaction, connection: Conn) => Promise<string>;
};

async function findRegistryByHash(
  conn: Conn,
  hashHex: string,
): Promise<RegistrySnapshot | null> {
  const hashBytes = hexToBytes(hashHex);
  const accounts = await conn.getProgramAccounts(PROGRAM_ID, {
    filters: [{ memcmp: { offset: 24, bytes: bs58.encode(hashBytes) } }],
  });
  if (accounts.length === 0) return null;
  const { pubkey, account } = accounts[0]!;
  const data = new Uint8Array(account.data);
  const documentId = data.slice(8, 24);
  const owner = new PublicKey(data.slice(56, 88));
  return {
    pda: pubkey,
    documentId,
    documentIdHex: bytesToHex(documentId),
    ownerB58: owner.toBase58(),
    status: data[112] ?? 0,
    requiredSigners: data[113] ?? 0,
    completedSigners: data[114] ?? 0,
  };
}

export function SignFlow({ hashHex }: { hashHex: string }) {
  const t = useTranslations('sign.flow');
  const locale = useLocale();
  const { connection } = useConnection();
  const adapter = useWallet();
  const { authenticated } = usePrivy();
  const { wallets: privyWallets } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [stashed, setStashed] = useState<StashedFile | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [balance, setBalance] = useState<number | null>(null);
  const [registry, setRegistry] = useState<RegistrySnapshot | null | undefined>(undefined);
  const [requiredSigners, setRequiredSigners] = useState<number>(1);
  const [alreadySigned, setAlreadySigned] = useState<boolean>(false);

  const active: ActiveWallet | null = useMemo(() => {
    if (privyWallets[0]) {
      const w = privyWallets[0];
      return {
        source: 'privy',
        pubkey: new PublicKey(w.address),
        send: async (tx) => {
          const serialized = tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          });
          const out = await signAndSendTransaction({
            transaction: new Uint8Array(serialized),
            wallet: w,
            chain: PRIVY_CHAIN,
          });
          return bs58.encode(out.signature);
        },
      };
    }
    if (adapter.connected && adapter.publicKey && adapter.sendTransaction) {
      return {
        source: 'adapter',
        pubkey: adapter.publicKey,
        send: (tx, conn) => adapter.sendTransaction!(tx, conn),
      };
    }
    return null;
  }, [privyWallets, adapter.connected, adapter.publicKey, adapter.sendTransaction, signAndSendTransaction]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem(`yoursign:pdf:${hashHex}`);
    if (raw) {
      try { setStashed(JSON.parse(raw) as StashedFile); }
      catch { /* ignore */ }
    }
  }, [hashHex]);

  // Fallback: when sessionStorage is empty (signer B opens link from a fresh
  // browser, or owner reopens after closing the tab) and the doc is already
  // anchored, fetch filename + byteLength from the API blob metadata.
  useEffect(() => {
    if (stashed) return;
    if (!registry) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://yoursign-api.videostreaminginc.workers.dev';
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${apiUrl}/documents/${registry.documentIdHex}`, { cache: 'no-store' });
        if (!r.ok) return;
        const meta = (await r.json()) as { filename?: string; byteLength?: number };
        if (!cancelled && meta.filename) {
          setStashed({
            filename: meta.filename,
            byteLength: meta.byteLength ?? 0,
            hashHex,
            ts: Date.now(),
          });
        }
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [registry, stashed, hashHex]);

  // Detect on-chain registry mode (register vs attest).
  useEffect(() => {
    let cancelled = false;
    setRegistry(undefined);
    (async () => {
      try {
        const snap = await findRegistryByHash(connection, hashHex);
        if (!cancelled) setRegistry(snap);
      } catch {
        if (!cancelled) setRegistry(null);
      }
    })();
    return () => { cancelled = true; };
  }, [connection, hashHex, status.kind]);

  // Detect if active wallet has already attested this registry.
  useEffect(() => {
    if (!active || !registry) { setAlreadySigned(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const [sigPda] = signatureAttestationPda(registry.documentId, active.pubkey);
        const info = await connection.getAccountInfo(sigPda);
        if (!cancelled) setAlreadySigned(info !== null);
      } catch {
        if (!cancelled) setAlreadySigned(false);
      }
    })();
    return () => { cancelled = true; };
  }, [active, registry, connection]);

  useEffect(() => {
    if (!active) { setBalance(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const lamports = await connection.getBalance(active.pubkey);
        if (!cancelled) setBalance(lamports / 1_000_000_000);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [active, connection]);

  const explorerUrl = useMemo(() => {
    if (status.kind !== 'done' && status.kind !== 'confirming') return '';
    const cluster = CLUSTER === 'mainnet-beta' ? '' : `?cluster=${CLUSTER}`;
    return `https://explorer.solana.com/tx/${status.signature}${cluster}`;
  }, [status]);

  const mode: 'register' | 'attest' | 'detecting' =
    registry === undefined ? 'detecting' : registry === null ? 'register' : 'attest';

  async function onSubmit() {
    if (!active) {
      setStatus({ kind: 'error', reason: t('errors.noWallet') });
      return;
    }
    try {
      setStatus({ kind: 'building' });

      let documentId: Uint8Array;
      let documentIdHex: string;
      const ixs = [];

      // Treasury fee — UI-bundled transfer to the platform wallet. v1.1 will
      // enforce this on-chain via an instructions-sysvar check inside the
      // program so callers can't bypass by crafting the tx manually. Sum
      // matches register_document (when relevant) + attest_signature.
      const totalFeeLamports =
        (mode === 'register' ? REGISTER_DOCUMENT_FEE_LAMPORTS : 0) +
        ATTEST_SIGNATURE_FEE_LAMPORTS;
      ixs.push(SystemProgram.transfer({
        fromPubkey: active.pubkey,
        toPubkey: TREASURY_PUBKEY,
        lamports: totalFeeLamports,
      }));

      if (mode === 'register') {
        documentId = newDocumentId();
        documentIdHex = bytesToHex(documentId);
        const canonicalHash = hexToBytes(hashHex);
        const workspaceId = hexToBytes(WORKSPACE_ID_HEX);
        ixs.push(registerDocumentIx({
          owner: active.pubkey,
          documentId,
          canonicalHash,
          workspaceId,
          requiredSigners,
        }));
      } else if (mode === 'attest' && registry) {
        documentId = registry.documentId;
        documentIdHex = registry.documentIdHex;
      } else {
        setStatus({ kind: 'error', reason: 'still detecting on-chain state…' });
        return;
      }

      const timestampIso = new Date().toISOString();
      const signingMsg = canonicalSigningMessage({
        documentIdHex,
        canonicalHashHex: hashHex,
        signerB58: active.pubkey.toBase58(),
        timestampIso,
      });
      const messageHash = new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signingMsg)),
      );
      const zeroSig = new Uint8Array(64);

      ixs.push(attestSignatureIx({
        signer: active.pubkey,
        documentId,
        signature: zeroSig,
        messageHash,
        kind: AttestationKind.Sign,
      }));

      const tx = new Transaction().add(...ixs);
      tx.feePayer = active.pubkey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;

      setStatus({ kind: 'awaiting-wallet' });
      const signature = await active.send(tx, connection);
      setStatus({ kind: 'confirming', signature });
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed',
      );

      // Owner-only: upload PDF blob (demo, plaintext) so /d/[id] can render.
      if (mode === 'register') {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://yoursign-api.videostreaminginc.workers.dev';
        if (stashed?.b64) {
          try {
            const bin = atob(stashed.b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            await fetch(`${apiUrl}/documents/${documentIdHex}`, {
              method: 'PUT',
              headers: {
                'content-type': 'application/pdf',
                'x-filename': stashed.filename,
                'x-canonical-hash': hashHex,
                'x-owner-b58': active.pubkey.toBase58(),
              },
              body: bytes,
            });
          } catch { /* upload best-effort; tx already on-chain */ }
        }
      }

      setStatus({ kind: 'done', signature, documentIdHex });
    } catch (e: unknown) {
      setStatus({
        kind: 'error',
        reason: e instanceof Error ? e.message : t('errors.submitFailed'),
      });
    }
  }

  const isConnected = !!active;
  const noFunds = balance !== null && balance < 0.006;
  const feeSol = (
    (mode === 'register' ? REGISTER_DOCUMENT_FEE_LAMPORTS : 0) +
    ATTEST_SIGNATURE_FEE_LAMPORTS
  ) / 1_000_000_000;
  const numberLocale = locale === 'pt' ? 'pt-BR' : 'en-US';
  const canSubmit =
    isConnected && !noFunds && !alreadySigned && mode !== 'detecting' &&
    status.kind !== 'building' && status.kind !== 'awaiting-wallet' &&
    status.kind !== 'confirming' && status.kind !== 'done' &&
    !(mode === 'attest' && registry && (registry.status === 2 || registry.status === 3));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <article className="surface-card">
        <div className="eyebrow" style={{ marginBottom: 8 }}>{t('documentLabel')}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
          {stashed?.filename ?? t('filenameFallback')}
        </div>
        {stashed?.byteLength ? (
          <div style={{ fontSize: 12, color: 'var(--ash)', marginTop: 4 }}>
            {t('bytes', { count: stashed.byteLength.toLocaleString(numberLocale) })}
          </div>
        ) : null}
        <div style={{ marginTop: 16 }}>
          <div className="eyebrow">{t('canonicalHash')}</div>
          <code style={{
            display: 'block', marginTop: 4,
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--ink)', wordBreak: 'break-all',
          }}>{hashHex}</code>
        </div>

        {mode === 'detecting' ? (
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--ash)' }}>
            {t('multi.detecting')}
          </div>
        ) : null}

        {mode === 'attest' && registry ? (
          <div style={{
            marginTop: 16, padding: 12,
            background: registry.status === 2 ? '#eaffe7' :
                        registry.status === 3 ? '#fff5f5' : '#eef4ff',
            border: `1px solid ${registry.status === 2 ? '#a7e8a7' :
                                  registry.status === 3 ? '#f5c6c6' : '#c5d4f5'}`,
            borderRadius: 8, fontSize: 13,
            color: registry.status === 2 ? '#1d6b1d' :
                   registry.status === 3 ? '#8a2222' : '#1d3d6b',
          }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              {t('multi.statusPrefix')} {STATUS_NAMES[registry.status] ?? '?'} —{' '}
              {registry.completedSigners} / {registry.requiredSigners}
            </div>
            <div style={{ fontSize: 12 }}>
              {t('multi.ownerLabel')}{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {registry.ownerB58.slice(0, 8)}…{registry.ownerB58.slice(-4)}
              </code>
            </div>
          </div>
        ) : null}
      </article>

      {!isConnected ? (
        <div className="surface-card" style={{ textAlign: 'center' }}>
          <p style={{ marginTop: 0, fontSize: 15, color: 'var(--ink)' }}>
            {t('connectPrompt')}
          </p>
          {!authenticated ? <WalletMultiButton /> : (
            <p style={{ fontSize: 13, color: 'var(--ash)', margin: 0 }}>
              {t('privyInitializing')}
            </p>
          )}
        </div>
      ) : (
        <article className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="eyebrow">
              {t('walletLabel', {
                source: active.source === 'privy' ? t('walletSourcePrivy') : t('walletSourceAdapter'),
              })}
            </div>
            <code style={{
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: 'var(--ink)', wordBreak: 'break-all',
            }}>{active.pubkey.toBase58()}</code>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ash)' }}>
              {t('balance', {
                balance: balance === null ? t('balanceLoading') : `${balance.toFixed(4)} SOL`,
              })}
            </div>
          </div>

          {mode === 'register' ? (
            <div>
              <label className="eyebrow" htmlFor="required-signers" style={{ display: 'block', marginBottom: 6 }}>
                {t('multi.requiredSignersLabel')}
              </label>
              <input
                id="required-signers"
                type="number"
                min={1}
                max={10}
                value={requiredSigners}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isNaN(n) && n >= 1 && n <= 10) setRequiredSigners(n);
                }}
                disabled={status.kind !== 'idle' && status.kind !== 'error'}
                style={{
                  width: 80, padding: '6px 10px',
                  border: '1px solid var(--hairline)', borderRadius: 6,
                  fontFamily: 'var(--font-mono)', fontSize: 14,
                  background: 'var(--canvas)', color: 'var(--ink)',
                }}
              />
              <p style={{ fontSize: 12, color: 'var(--ash)', margin: '6px 0 0' }}>
                {t('multi.requiredSignersHint')}
              </p>
            </div>
          ) : null}

          {alreadySigned ? (
            <div style={{
              background: '#eaffe7',
              border: '1px solid #a7e8a7',
              color: '#1d6b1d',
              borderRadius: 8,
              padding: 12,
              fontSize: 13,
            }}>
              {t('multi.alreadySigned')}
            </div>
          ) : null}

          {!alreadySigned && mode !== 'detecting' ? (
            <div style={{
              background: 'var(--cloud)',
              border: '1px solid var(--hairline)',
              borderRadius: 8,
              padding: 10,
              fontSize: 12,
              color: 'var(--ash)',
            }}>
              {t('multi.feeLabel')}{' '}
              <strong style={{ color: 'var(--ink)' }}>{feeSol.toFixed(4)} SOL</strong>{' '}
              {t('multi.feeSuffix')}
            </div>
          ) : null}

          {noFunds ? (
            <div style={{
              background: '#fffbe9',
              border: '1px solid #f5e1a7',
              color: '#6b4f00',
              borderRadius: 8,
              padding: 12,
              fontSize: 13,
            }}>
              {t('noFunds')}{' '}
              <a
                href={`https://faucet.solana.com/?address=${active.pubkey.toBase58()}`}
                target="_blank"
                rel="noreferrer"
                style={{ borderBottom: '1px solid #6b4f00' }}
              >
                {t('faucetLink')}
              </a>
              {t('faucetSuffix')}
            </div>
          ) : null}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="btn btn-primary btn-lg"
          >
            {status.kind === 'building' ? t('button.building') :
             status.kind === 'awaiting-wallet' ? t('button.awaitingWallet') :
             status.kind === 'confirming' ? t('button.confirming') :
             status.kind === 'done' ? t('button.done') :
             mode === 'attest' ? t('multi.signButton') :
             t('button.idle')}
          </button>

          {status.kind === 'error' ? (
            <p style={{ fontSize: 13, color: 'var(--error)', margin: 0 }}>{status.reason}</p>
          ) : null}

          {(status.kind === 'confirming' || status.kind === 'done') ? (
            <div style={{ background: 'var(--cloud)', padding: 14, borderRadius: 8 }}>
              <div className="eyebrow">{t('txSignature')}</div>
              <code style={{
                display: 'block', marginTop: 4,
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--ink)', wordBreak: 'break-all',
              }}>{status.signature}</code>
              {status.kind === 'done' ? (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ash)' }}>
                  {t('documentId')} <code style={{ color: 'var(--ink)' }}>{status.documentIdHex}</code>
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                  style={{ fontSize: 13 }}
                >
                  {t('viewExplorer')}
                </a>
                {status.kind === 'done' ? (
                  <a
                    href={`/d/${status.documentIdHex}`}
                    className="btn btn-primary"
                    style={{ fontSize: 13 }}
                  >
                    {t('openDocument')}
                  </a>
                ) : null}
              </div>
              {status.kind === 'done' ? (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ash)' }}>
                  {t('multi.shareSignerLink')}{' '}
                  <code style={{ color: 'var(--ink)' }}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/sign/${hashHex}` : `/sign/${hashHex}`}
                  </code>
                </div>
              ) : null}
            </div>
          ) : null}
        </article>
      )}
    </div>
  );
}
