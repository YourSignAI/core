export type Env = {
  SOLANA_CLUSTER: 'devnet' | 'mainnet-beta';
  SOLANA_RPC_URL: string;
  PROGRAM_ID: string;
  SIWS_DOMAIN: string;
  SIWS_AUDIENCE: string;
  AI_GATEWAY_BASE: string;
  SCOPE_R2_BUCKET: string;

  // secrets
  SIWS_JWT_SECRET?: string;
  AI_GATEWAY_TOKEN?: string;
  ANTHROPIC_API_KEY?: string;

  // bindings
  SCOPES: R2Bucket;
  DOCS: R2Bucket;
  SIWS_NONCES: KVNamespace;
  DB: Hyperdrive;
  AI: Ai;
};
