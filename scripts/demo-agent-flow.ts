// scripts/demo-agent-flow.ts — end-to-end demo for AC-10.5.1.
//
// Reads the deployed program IDL, generates a fresh agent keypair, signs a
// canonical delegation with the *configured Solana CLI keypair* as principal,
// submits register_agent → attest_agent_action(sign_document) → revoke.
//
// Run after `./scripts/deploy-devnet.sh` succeeded.
//
// Usage:
//   pnpm exec tsx scripts/demo-agent-flow.ts --cluster devnet

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Ed25519Program,
  Transaction,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import {
  canonicalDelegationMessage,
  canonicalActionMessage,
  canonicalRevokeMessage,
  hashMessage,
  hashScope,
  type AgentScope,
} from '@yoursign/agent-sdk';

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

function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

async function main() {
  const cluster = arg('cluster', 'devnet');
  const rpc = CLUSTERS[cluster] ?? cluster;
  const keypairPath = arg('keypair', resolve(homedir(), '.config/solana/id.json'));

  const repoRoot = resolve(__dirname, '..');
  const idlPath = resolve(repoRoot, 'programs/yoursign/target/idl/yoursign.json');
  const programKeypairPath = resolve(repoRoot, 'programs/yoursign/target/deploy/yoursign-keypair.json');

  if (!existsSync(idlPath)) throw new Error(`idl missing — run anchor build first: ${idlPath}`);

  const idl = JSON.parse(readFileSync(idlPath, 'utf8'));
  const programKeyBytes = JSON.parse(readFileSync(programKeypairPath, 'utf8')) as number[];
  const programPubkey = Keypair.fromSecretKey(Uint8Array.from(programKeyBytes)).publicKey;

  const conn = new Connection(rpc, 'confirmed');
  const principal = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(keypairPath, 'utf8'))),
  );
  const agent = Keypair.generate();

  const provider = new anchor.AnchorProvider(conn, new anchor.Wallet(principal), { commitment: 'confirmed' });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider);

  console.log(`cluster      ${cluster}`);
  console.log(`program      ${programPubkey.toBase58()}`);
  console.log(`principal    ${principal.publicKey.toBase58()}`);
  console.log(`agent        ${agent.publicKey.toBase58()}`);

  // ─── 1. delegate ─────────────────────────────────────────────────────────
  const expiresAt = Math.floor(Date.now() / 1000) + 24 * 3600;
  const expiresAtIso = new Date(expiresAt * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const nonce = new Uint8Array(32);
  crypto.getRandomValues(nonce);
  const nonceHex = bytesToHex(nonce);

  const scope: AgentScope = {
    tools: ['sign_document', 'verify'],
    documents: 'any',
    spendCapMicroUsdc: 0,
    expiresAt: expiresAtIso,
  };
  const scopeHash = hashScope(scope);

  const delegationMsg = canonicalDelegationMessage({
    principal: principal.publicKey.toBase58(),
    agent: agent.publicKey.toBase58(),
    tools: scope.tools,
    documentsClause: 'any',
    spendCapMicroUsdc: 0,
    expiresAt: expiresAtIso,
    nonce: nonceHex,
  });
  const delegationMsgHash = hashMessage(delegationMsg);

  const ed25519IxDelegation = Ed25519Program.createInstructionWithPrivateKey({
    privateKey: principal.secretKey,
    message: Buffer.from(delegationMsg, 'utf8'),
  });

  // PDA: [b"delegation", principal, nonce]
  const [delegationPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('delegation'), principal.publicKey.toBuffer(), Buffer.from(nonce)],
    programPubkey,
  );

  // delegation_id = sha256(principal || nonce)[..16]
  const delegationIdBytes = (await crypto.subtle.digest(
    'SHA-256',
    Uint8Array.from([...principal.publicKey.toBytes(), ...nonce]),
  ));
  const delegationId = new Uint8Array(delegationIdBytes).slice(0, 16);

  // We need the principal's signature over the canonical message hash. The
  // ed25519_program ix already covers this; the program's verify_ed25519_sibling_ix
  // checks the sibling ix for matching pubkey/sig/message. So we extract the sig
  // bytes from what we'd put inside that ix.
  // For convenience, sign locally too:
  const sodium = await import('@noble/ed25519');
  const principalSig = await sodium.signAsync(delegationMsgHash, principal.secretKey.slice(0, 32));

  console.log('\n→ register_agent');
  const tx1 = new Transaction()
    .add(ed25519IxDelegation)
    .add(
      await (program.methods as any)
        .registerAgent({
          delegationId: Array.from(delegationId),
          principalPubkey: principal.publicKey,
          agentPubkey: agent.publicKey,
          principalB58: principal.publicKey.toBase58(),
          agentB58: agent.publicKey.toBase58(),
          toolsCsv: [...scope.tools].sort().join(','),
          documentsClause: 'any',
          spendCapMicroUsdc: new anchor.BN(0),
          expiresAt: new anchor.BN(expiresAt),
          expiresAtIso,
          nonce: Array.from(nonce),
          nonceHex,
          scopeHash: Array.from(scopeHash),
          principalSig: Array.from(principalSig),
        })
        .accounts({
          delegation: delegationPda,
          payer: principal.publicKey,
          instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .instruction(),
    );
  const sig1 = await provider.sendAndConfirm(tx1, [principal]);
  console.log(`✓ register_agent       ${sig1}`);
  console.log(`  delegation pda       ${delegationPda.toBase58()}`);

  // ─── 2. attest_agent_action(sign_document) ──────────────────────────────
  console.log('\n→ attest_agent_action(sign_document)');
  const docHash = new Uint8Array(32);
  crypto.getRandomValues(docHash);
  const actionTimestampIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const actionNonce = new Uint8Array(32);
  crypto.getRandomValues(actionNonce);
  const actionNonceHex = bytesToHex(actionNonce);
  const delegationIdHex = bytesToHex(delegationId);
  const targetIdHex = bytesToHex(docHash);

  const actionMsg = canonicalActionMessage({
    delegationId: delegationIdHex,
    tool: 'sign_document',
    targetId: targetIdHex,
    timestamp: actionTimestampIso,
    nonce: actionNonceHex,
  });
  const actionMsgHash = hashMessage(actionMsg);
  const agentSig = await sodium.signAsync(actionMsgHash, agent.secretKey.slice(0, 32));

  const ed25519IxAction = Ed25519Program.createInstructionWithPrivateKey({
    privateKey: agent.secretKey,
    message: Buffer.from(actionMsg, 'utf8'),
  });

  const actionId = new Uint8Array(16);
  crypto.getRandomValues(actionId);
  const [actionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('action'), Buffer.from(actionId)],
    programPubkey,
  );
  const [manifestPda] = PublicKey.findProgramAddressSync([Buffer.from('tool-manifest')], programPubkey);

  const tx2 = new Transaction()
    .add(ed25519IxAction)
    .add(
      await (program.methods as any)
        .attestAgentAction({
          actionId: Array.from(actionId),
          delegationIdHex,
          actionKind: { signDocument: {} },
          targetId: Array.from(docHash),
          targetIdHex,
          spendMicroUsdc: new anchor.BN(0),
          timestampIso: actionTimestampIso,
          nonceHex: actionNonceHex,
          agentSig: Array.from(agentSig),
          principalSigWitness: null,
        })
        .accounts({
          delegation: delegationPda,
          toolManifest: manifestPda,
          action: actionPda,
          payer: principal.publicKey,
          instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .instruction(),
    );
  const sig2 = await provider.sendAndConfirm(tx2, [principal]);
  console.log(`✓ attest_agent_action  ${sig2}`);

  // ─── 3. revoke ──────────────────────────────────────────────────────────
  console.log('\n→ revoke_delegation');
  const revokeNonce = new Uint8Array(32);
  crypto.getRandomValues(revokeNonce);
  const revokeNonceHex = bytesToHex(revokeNonce);
  const revokeMsg = canonicalRevokeMessage({ delegationId: delegationIdHex, nonce: revokeNonceHex });
  const revokeMsgHash = hashMessage(revokeMsg);
  const principalRevokeSig = await sodium.signAsync(revokeMsgHash, principal.secretKey.slice(0, 32));
  const ed25519IxRevoke = Ed25519Program.createInstructionWithPrivateKey({
    privateKey: principal.secretKey,
    message: Buffer.from(revokeMsg, 'utf8'),
  });

  const tx3 = new Transaction()
    .add(ed25519IxRevoke)
    .add(
      await (program.methods as any)
        .revokeDelegation({
          delegationIdHex,
          nonceHex: revokeNonceHex,
          principalSig: Array.from(principalRevokeSig),
        })
        .accounts({
          delegation: delegationPda,
          principal: principal.publicKey,
          instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .instruction(),
    );
  const sig3 = await provider.sendAndConfirm(tx3, [principal]);
  console.log(`✓ revoke_delegation    ${sig3}`);

  console.log('\n─────────────────────────────────────────');
  console.log('✓ AC-10.5.1 demo complete');
  console.log(`  https://explorer.solana.com/address/${delegationPda.toBase58()}?cluster=${cluster}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
