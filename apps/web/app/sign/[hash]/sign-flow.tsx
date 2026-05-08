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
import { PublicKey, Transaction, type Connection as Conn } from '@solana/web3.js';
import {
  registerDocumentIx,
  newDocumentId,
  hexToBytes,
  bytesToHex,
} from '@yoursign/solana-sdk';

type StashedFile = {
  filename: string;
  byteLength: number;
  hashHex: string;
  ts: number;
  b64?: string;
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

type ActiveWallet = {
  source: 'privy' | 'adapter';
  pubkey: PublicKey;
  send: (tx: Transaction, connection: Conn) => Promise<string>;
};

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

  async function onAnchor() {
    if (!active) {
      setStatus({ kind: 'error', reason: t('errors.noWallet') });
      return;
    }
    try {
      setStatus({ kind: 'building' });
      const documentId = newDocumentId();
      const canonicalHash = hexToBytes(hashHex);
      const workspaceId = hexToBytes(WORKSPACE_ID_HEX);

      const ix = registerDocumentIx({
        owner: active.pubkey,
        documentId,
        canonicalHash,
        workspaceId,
        requiredSigners: 1,
      });
      const tx = new Transaction().add(ix);
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
      const documentIdHex = bytesToHex(documentId);

      // Upload PDF blob (demo, plaintext) so /d/[id] can render for any reader.
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

      setStatus({ kind: 'done', signature, documentIdHex });
    } catch (e: unknown) {
      setStatus({
        kind: 'error',
        reason: e instanceof Error ? e.message : t('errors.submitFailed'),
      });
    }
  }

  const isConnected = !!active;
  const noFunds = balance !== null && balance < 0.003;
  const numberLocale = locale === 'pt' ? 'pt-BR' : 'en-US';

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
            disabled={
              status.kind === 'building' ||
              status.kind === 'awaiting-wallet' ||
              status.kind === 'confirming' ||
              status.kind === 'done' ||
              noFunds
            }
            onClick={onAnchor}
            className="btn btn-primary btn-lg"
          >
            {status.kind === 'idle' ? t('button.idle') :
             status.kind === 'building' ? t('button.building') :
             status.kind === 'awaiting-wallet' ? t('button.awaitingWallet') :
             status.kind === 'confirming' ? t('button.confirming') :
             status.kind === 'done' ? t('button.done') :
             t('button.retry')}
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
                  {t('share')}{' '}
                  <code style={{ color: 'var(--ink)' }}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/d/${status.documentIdHex}` : `/d/${status.documentIdHex}`}
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
