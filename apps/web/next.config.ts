import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@yoursign/agent-sdk',
    '@yoursign/crypto',
    '@yoursign/pdf-engine',
    '@yoursign/schemas',
    '@yoursign/solana-sdk',
    '@yoursign/ui',
  ],
  experimental: {
    typedRoutes: true,
  },
};

export default withNextIntl(config);
