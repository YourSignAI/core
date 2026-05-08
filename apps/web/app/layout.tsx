import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { WalletProviders } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'YourSign — assinatura descentralizada',
  description: 'Assine documentos com sua carteira Solana. Verificável on-chain. Sem servidor no caminho.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <WalletProviders>{children}</WalletProviders>
      </body>
    </html>
  );
}
