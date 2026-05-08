import type { NextConfig } from 'next';

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

export default config;
