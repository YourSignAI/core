// Demo document blob storage. Stores raw PDF bytes in R2 keyed by
// `<documentIdHex>` (32 hex chars from the on-chain ULID).
//
// Sprint 2 Thursday wires the X25519 envelope encryption per AC-3.1.2; until
// then this is plaintext and clearly labeled demo-only.

import { Hono } from 'hono';
import type { Env } from '../env.js';

export const docRoutes = new Hono<{ Bindings: Env }>();

const ID_RE = /^[0-9a-f]{32}$/;
const HASH_RE = /^[0-9a-f]{64}$/;
const MAX_BYTES = 25 * 1024 * 1024;

docRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  if (!ID_RE.test(id)) return c.json({ error: 'bad document_id' }, 400);
  const filename = c.req.header('x-filename') ?? `${id}.pdf`;
  const expectedHash = c.req.header('x-canonical-hash') ?? '';
  if (!HASH_RE.test(expectedHash)) return c.json({ error: 'missing x-canonical-hash header' }, 400);
  const ownerB58 = c.req.header('x-owner-b58') ?? '';
  if (!ownerB58) return c.json({ error: 'missing x-owner-b58 header' }, 400);

  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0) return c.json({ error: 'empty body' }, 400);
  if (body.byteLength > MAX_BYTES + 1024) return c.json({ error: 'PDF > 25 MB' }, 413);

  const encryption = c.req.header('x-encryption') ?? '';

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
        filename,
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
  // Strip CR/LF/quote/path-traversal from filename header to avoid response
  // splitting and Content-Disposition smuggling.
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
      'access-control-allow-origin': '*',
      'x-encryption': encryption,
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
    byteLength: obj.size,
    uploadedAt: obj.customMetadata?.uploadedAt ?? null,
    blobUrl: `${new URL(c.req.url).origin}/documents/${id}/blob`,
  });
});
