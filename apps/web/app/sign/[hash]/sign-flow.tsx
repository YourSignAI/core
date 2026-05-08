'use client';

import { useEffect, useMemo, useState } from 'react';
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
      setStatus({ kind: 'error', reason: 'Conecte uma carteira primeiro.' });
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
      setStatus({ kind: 'done', signature, documentIdHex: bytesToHex(documentId) });
    } catch (e: unknown) {
      setStatus({
        kind: 'error',
        reason: e instanceof Error ? e.message : 'Falha ao submeter transação.',
      });
    }
  }

  const isConnected = !!active;
  const noFunds = balance !== null && balance < 0.003;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <article className="surface-card">
        <div className="eyebrow" style={{ marginBottom: 8 }}>Documento</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
          {stashed?.filename ?? 'PDF (sem metadados — abriu /sign direto)'}
        </div>
        {stashed?.byteLength ? (
          <div style={{ fontSize: 12, color: 'var(--ash)', marginTop: 4 }}>
            {stashed.byteLength.toLocaleString('pt-BR')} bytes
          </div>
        ) : null}
        <div style={{ marginTop: 16 }}>
          <div className="eyebrow">SHA-256 canônico</div>
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
            Conecte Phantom, Backpack, Solflare ou login social.
          </p>
          {!authenticated ? <WalletMultiButton /> : (
            <p style={{ fontSize: 13, color: 'var(--ash)', margin: 0 }}>
              Privy autenticado, mas wallet Solana ainda inicializando…
            </p>
          )}
        </div>
      ) : (
        <article className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="eyebrow">
              Carteira ({active.source === 'privy' ? 'Privy embedded' : 'Wallet Adapter'})
            </div>
            <code style={{
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: 'var(--ink)', wordBreak: 'break-all',
            }}>{active.pubkey.toBase58()}</code>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ash)' }}>
              Saldo: {balance === null ? '…' : `${balance.toFixed(4)} SOL`}
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
              Saldo insuficiente. Precisa ~0.003 SOL pra rent + fee.{' '}
              <a
                href={`https://faucet.solana.com/?address=${active.pubkey.toBase58()}`}
                target="_blank"
                rel="noreferrer"
                style={{ borderBottom: '1px solid #6b4f00' }}
              >
                Pegar SOL devnet (faucet)
              </a>
              . Cole o pubkey acima e peça 1 SOL. Atualiza esta página depois.
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
            {status.kind === 'idle' ? 'Ancorar hash on-chain' :
             status.kind === 'building' ? 'Construindo transação…' :
             status.kind === 'awaiting-wallet' ? 'Aprove na carteira…' :
             status.kind === 'confirming' ? 'Confirmando…' :
             status.kind === 'done' ? 'Ancorado ✓' :
             'Tentar novamente'}
          </button>

          {status.kind === 'error' ? (
            <p style={{ fontSize: 13, color: 'var(--error)', margin: 0 }}>{status.reason}</p>
          ) : null}

          {(status.kind === 'confirming' || status.kind === 'done') ? (
            <div style={{ background: 'var(--cloud)', padding: 14, borderRadius: 8 }}>
              <div className="eyebrow">Tx signature</div>
              <code style={{
                display: 'block', marginTop: 4,
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--ink)', wordBreak: 'break-all',
              }}>{status.signature}</code>
              {status.kind === 'done' ? (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ash)' }}>
                  document_id: <code style={{ color: 'var(--ink)' }}>{status.documentIdHex}</code>
                </div>
              ) : null}
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
                style={{ marginTop: 12, fontSize: 13 }}
              >
                Ver no Solana Explorer →
              </a>
            </div>
          ) : null}
        </article>
      )}
    </div>
  );
}
