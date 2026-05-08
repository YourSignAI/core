// Unified WalletInterface (ADR-0006). Both Phantom (browser) and Privy
// (embedded MPC) implement this surface; consumers don't branch on identity.

export type WalletInterface = {
  publicKey: { toBase58(): string };
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction: <T extends { serialize(): Uint8Array }>(tx: T) => Promise<T>;
};
