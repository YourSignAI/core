// Worker bindings. wrangler.toml is the source of truth — keep this in sync.

export type Env = {
  // vars
  SOLANA_CLUSTER: 'devnet' | 'mainnet-beta';
  SOLANA_RPC_URL: string;
  LIGHT_RPC_URL: string;
  PROGRAM_ID: string;
  SCOPE_R2_BUCKET: string;

  // secrets — set via `wrangler secret put`
  AGENT_KEYPAIR_SECRET?: string;
  AI_GATEWAY_TOKEN?: string;
  ANTHROPIC_API_KEY?: string;

  // bindings
  SCOPES: R2Bucket;
  MCP_SESSIONS: KVNamespace;
  AI: Ai;
};
