'use client';

import { useMemo, type ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';

import '@solana/wallet-adapter-react-ui/styles.css';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';

export function WalletProviders({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const solanaConnectors = useMemo(() => toSolanaWalletConnectors(), []);

  // ADR-0006: Wallet Adapter for crypto-natives + Privy MPC for email/Google/Apple.
  // Single PrivyProvider wraps everything; embedded wallets surface as Solana wallets
  // through the wallet-adapter compat layer.
  const inner = (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );

  if (!PRIVY_APP_ID) {
    // Local dev without env: show Wallet Adapter only (Phantom/Backpack/Solflare).
    return inner;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#ff385c',
          walletList: ['phantom', 'backpack', 'solflare', 'wallet_connect'],
        },
        loginMethods: ['email', 'google', 'apple', 'wallet'],
        externalWallets: { solana: { connectors: solanaConnectors } },
        embeddedWallets: {
          solana: { createOnLogin: 'users-without-wallets' },
        },
        solana: {
          rpcs: {
            'solana:devnet': {
              rpc: createSolanaRpc('https://api.devnet.solana.com'),
              rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.devnet.solana.com'),
              blockExplorerUrl: 'https://explorer.solana.com/?cluster=devnet',
            },
            'solana:mainnet': {
              rpc: createSolanaRpc('https://api.mainnet-beta.solana.com'),
              rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.mainnet-beta.solana.com'),
              blockExplorerUrl: 'https://explorer.solana.com',
            },
          },
        },
      }}
    >
      {inner}
    </PrivyProvider>
  );
}
