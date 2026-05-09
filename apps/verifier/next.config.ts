import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@yoursign/agent-sdk',
    '@yoursign/crypto',
    '@yoursign/pdf-engine',
    '@yoursign/solana-sdk',
    '@yoursign/ui',
  ],
};

export default withNextIntl(config);
