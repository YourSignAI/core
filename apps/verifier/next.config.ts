import type { NextConfig } from 'next';

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

export default config;
