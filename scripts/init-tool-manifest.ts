// scripts/init-tool-manifest.ts
//
// Submits `init_tool_manifest` once per cluster. Idempotent: skips if the
// PDA already exists. Reads program-id from the Anchor IDL after `anchor build`.
//
// Usage: pnpm exec tsx scripts/init-tool-manifest.ts --cluster devnet

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

type ToolEntry = { id: { delegate?: {}; signDocument?: {}; verify?: {}; revoke?: {} }; maxSpendMicroUsdc: anchor.BN; enabled: boolean };

const CLUSTERS: Record<string, string> = {
  devnet: 'https://api.devnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  localnet: 'http://127.0.0.1:8899',
};

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing --${name}`);
  }
  return process.argv[i + 1]!;
}

async function main() {
  const cluster = arg('cluster', 'devnet');
  const rpc = CLUSTERS[cluster] ?? cluster;
  const keypairPath = arg('keypair', resolve(homedir(), '.config/solana/id.json'));

  const repoRoot = resolve(__dirname, '..');
  const idlPath = resolve(repoRoot, 'programs/yoursign/target/idl/yoursign.json');
  const programKeypairPath = resolve(repoRoot, 'programs/yoursign/target/deploy/yoursign-keypair.json');

  if (!existsSync(idlPath)) throw new Error(`idl missing — run anchor build first: ${idlPath}`);
  if (!existsSync(programKeypairPath)) throw new Error(`program keypair missing: ${programKeypairPath}`);

  const idl = JSON.parse(readFileSync(idlPath, 'utf8'));
  const programId = new PublicKey(JSON.parse(readFileSync(programKeypairPath, 'utf8')).slice ? '' : '');
  // anchor 0.30 stores program-id in idl.metadata.address; fallback to keypair derivation
  const idAddr = idl.metadata?.address ?? idl.address;
  const programPubkey = idAddr ? new PublicKey(idAddr) : programId;

  const conn = new Connection(rpc, 'confirmed');
  const payerSecret = new Uint8Array(JSON.parse(readFileSync(keypairPath, 'utf8')));
  const payer = Keypair.fromSecretKey(payerSecret);

  const provider = new anchor.AnchorProvider(conn, new anchor.Wallet(payer), { commitment: 'confirmed' });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider);

  const [manifestPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('tool-manifest')],
    programPubkey,
  );

  const existing = await conn.getAccountInfo(manifestPda);
  if (existing) {
    console.log(`✓ tool manifest already initialized at ${manifestPda.toBase58()}`);
    return;
  }

  const tools = [
    { id: { delegate: {} }, maxSpendMicroUsdc: new anchor.BN(0), enabled: true },
    { id: { signDocument: {} }, maxSpendMicroUsdc: new anchor.BN(0), enabled: true },
    { id: { verify: {} }, maxSpendMicroUsdc: new anchor.BN(0), enabled: true },
    { id: { revoke: {} }, maxSpendMicroUsdc: new anchor.BN(0), enabled: true },
  ];

  console.log(`→ submitting init_tool_manifest on ${cluster} for ${programPubkey.toBase58()}`);
  const sig = await (program.methods as any)
    .initToolManifest({ tools })
    .accounts({
      manifest: manifestPda,
      authority: payer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(`✓ tool manifest pda  ${manifestPda.toBase58()}`);
  console.log(`✓ tx signature       ${sig}`);
  console.log(`✓ explorer           https://explorer.solana.com/tx/${sig}?cluster=${cluster}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
