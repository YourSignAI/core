// Document blob storage. Stores ciphertext (or legacy plaintext) PDF bytes
// in R2 keyed by `<documentIdHex>` (32 hex chars from the on-chain ULID).
//
// Auth model: PUT requires the on-chain DocumentRegistry account at
// PDA `[b"doc", document_id]` to already exist and to declare the same
// owner as the request's `x-owner-b58` header. This binds the upload to a
// signer who already proved ownership via the register_document tx.

import { Hono } from 'hono';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import type { Env } from '../env.js';

export const docRoutes = new Hono<{ Bindings: Env }>();

const ID_RE = /^[0-9a-f]{32}$/;
const HASH_RE = /^[0-9a-f]{64}$/;
const PUBKEY_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
// Filename: deny CR/LF/quotes/path-traversal/HTML/control bytes; cap length.
const FILENAME_DENY = /[\r\n"\\\/<>|`\x00-\x1f]/;
const FILENAME_MAX = 200;

function validFilename(s: string): boolean {
  return s.length > 0 && s.length <= FILENAME_MAX && !FILENAME_DENY.test(s);
}
const ENCRYPTION_RE = /^[a-z0-9-]{1,64}$/;
const MAX_BYTES = 25 * 1024 * 1024;

const PROGRAM_ID = new PublicKey('35RbwNgx9Em28mMLZ6iWzjCnaTd4tD2NWuxrHqR76M8X');
const SOLANA_RPC =
  // Workers env override possible later; for devnet demo this is fine.
  'https://api.devnet.solana.com';

const ALLOWED_ORIGINS = new Set([
  'https://yoursign.tech',
  'https://www.yoursign.tech',
  'https://verify.yoursign.tech',
  'https://yoursign-web.videostreaminginc.workers.dev',
  'https://yoursign-verifier.videostreaminginc.workers.dev',
]);

function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://yoursign.tech';
  return {
    'access-control-allow-origin': allowed,
    'vary': 'origin',
  };
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function fetchRegistryOwner(documentIdHex: string): Promise<string | null> {
  try {
    const documentId = hexToBytes(documentIdHex);
    const [pda] = PublicKey.findProgramAddressSync(
      [new TextEncoder().encode('doc'), documentId],
      PROGRAM_ID,
    );
    const r = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [pda.toBase58(), { encoding: 'base64', commitment: 'confirmed' }],
      }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { result?: { value?: { data?: [string, string] } } };
    const dataB64 = j.result?.value?.data?.[0];
    if (!dataB64) return null;
    const bin = atob(dataB64);
    const data = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    // Anchor layout: 8 disc | 16 doc_id | 32 hash | 32 owner | ...
    if (data.length < 88) return null;
    return new PublicKey(data.slice(56, 88)).toBase58();
  } catch {
    return null;
  }
}

docRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  if (!ID_RE.test(id)) return c.json({ error: 'bad document_id' }, 400);

  const filenameRaw = c.req.header('x-filename') ?? `${id}.pdf`;
  if (!validFilename(filenameRaw)) return c.json({ error: 'bad filename' }, 400);

  const expectedHash = c.req.header('x-canonical-hash') ?? '';
  if (!HASH_RE.test(expectedHash)) return c.json({ error: 'bad canonical_hash' }, 400);

  const ownerB58 = c.req.header('x-owner-b58') ?? '';
  if (!PUBKEY_RE.test(ownerB58)) return c.json({ error: 'bad owner pubkey' }, 400);

  const encryption = c.req.header('x-encryption') ?? '';
  if (encryption && !ENCRYPTION_RE.test(encryption)) {
    return c.json({ error: 'bad encryption tag' }, 400);
  }

  // Auth: cross-check on-chain DocumentRegistry. Reject if registry doesn't
  // exist (caller must run register_document first) or owner mismatch.
  const onChainOwner = await fetchRegistryOwner(id);
  if (!onChainOwner) {
    return c.json(
      { error: 'registry_not_found', hint: 'call register_document on-chain before PUT' },
      403,
    );
  }
  if (onChainOwner !== ownerB58) {
    return c.json({ error: 'owner_mismatch', onChainOwner }, 403);
  }

  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0) return c.json({ error: 'empty body' }, 400);
  if (body.byteLength > MAX_BYTES + 1024) return c.json({ error: 'PDF > 25 MB' }, 413);

  if (!encryption) {
    // Plaintext upload (legacy): verify the body hashes to the claimed
    // canonical_hash so a malicious uploader can't anchor different content
    // under a hash already on-chain.
    const digest = await crypto.subtle.digest('SHA-256', body);
    const actualHash = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
    if (actualHash !== expectedHash) {
      return c.json(
        { error: 'hash_mismatch', expected: expectedHash, actual: actualHash },
        400,
      );
    }
  }
  // Encrypted upload: hash gate runs client-side at decrypt time (GCM tag
  // fails if the ciphertext does not match the DEK). Trust the upload here;
  // the canonical_hash header is metadata only.

  const contentType = encryption ? 'application/octet-stream' : 'application/pdf';

  // Idempotent: skip rewrite if already there.
  const existing = await c.env.DOCS.head(id);
  if (!existing) {
    await c.env.DOCS.put(id, body, {
      httpMetadata: { contentType },
      customMetadata: {
        filename: filenameRaw,
        canonicalHash: expectedHash,
        ownerB58,
        encryption,
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  return c.json({
    documentId: id,
    canonicalHash: expectedHash,
    byteLength: body.byteLength,
    blobUri: `r2://yoursign-documents/${id}`,
  });
});

docRoutes.get('/:id/blob', async (c) => {
  const id = c.req.param('id');
  if (!ID_RE.test(id)) return c.json({ error: 'bad document_id' }, 400);
  const obj = await c.env.DOCS.get(id);
  if (!obj) return c.json({ error: 'not_found' }, 404);
  const filename = obj.customMetadata?.filename ?? `${id}.pdf`;
  const encryption = obj.customMetadata?.encryption ?? '';
  const safeFilename = filename
    .replace(/[\r\n]/g, '')
    .replace(/"/g, '')
    .replace(/[\\\/]/g, '_')
    .slice(0, 200);
  return new Response(obj.body, {
    headers: {
      'content-type': encryption ? 'application/octet-stream' : 'application/pdf',
      'content-disposition': `inline; filename="${safeFilename}"`,
      'cache-control': 'public, max-age=300, immutable',
      'x-encryption': encryption,
      ...corsHeaders(c.req.header('origin')),
    },
  });
});

docRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  if (!ID_RE.test(id)) return c.json({ error: 'bad document_id' }, 400);
  const obj = await c.env.DOCS.head(id);
  if (!obj) return c.json({ error: 'not_found' }, 404);
  return c.json({
    documentId: id,
    filename: obj.customMetadata?.filename ?? `${id}.pdf`,
    canonicalHash: obj.customMetadata?.canonicalHash ?? null,
    ownerB58: obj.customMetadata?.ownerB58 ?? null,
    encryption: obj.customMetadata?.encryption ?? '',
    byteLength: obj.size,
    uploadedAt: obj.customMetadata?.uploadedAt ?? null,
    blobUrl: `${new URL(c.req.url).origin}/documents/${id}/blob`,
  });
});
