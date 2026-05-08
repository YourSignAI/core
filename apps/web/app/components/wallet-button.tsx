'use client';

import { useEffect, useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function WalletButton() {
  // Always render markup; differ behavior on hydration so SSR matches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button className="btn btn-secondary" style={{ padding: '10px 16px' }} disabled>
        Conectar
      </button>
    );
  }

  if (!PRIVY_APP_ID) {
    return <WalletMultiButton />;
  }

  return <PrivyAwareButton />;
}

function PrivyAwareButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();

  if (!ready) {
    return (
      <button className="btn btn-secondary" style={{ padding: '10px 16px' }} disabled>
        Carregando…
      </button>
    );
  }

  if (authenticated) {
    // Prefer first Solana wallet (embedded or external). Falls back to email/handle.
    const solana = solanaWallets[0]?.address ?? '';
    const fallback = user?.email?.address ?? user?.wallet?.address ?? '';
    const wallet = solana || fallback;
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <CopyPill address={wallet} solana={!!solana} />
        <button onClick={logout} className="btn btn-ghost" style={{ padding: '8px 14px' }}>
          Sair
        </button>
      </div>
    );
  }

  return (
    <button onClick={login} className="btn btn-secondary" style={{ padding: '10px 16px' }}>
      Conectar
    </button>
  );
}

function CopyPill({ address, solana }: { address: string; solana: boolean }) {
  const [copied, setCopied] = useState(false);
  const short = address.length > 10 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
  const network = solana ? 'Solana' : 'no Solana wallet';

  async function onCopy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* ignore */ }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="pill"
      title={`${network}: ${address} (clique para copiar)`}
      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      {copied ? '✓ copiado' : short}
      {!copied ? (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="4" y="4" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 11V3.5C3 2.67 3.67 2 4.5 2H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ) : null}
    </button>
  );
}
