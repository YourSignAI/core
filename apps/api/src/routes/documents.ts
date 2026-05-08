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
  if (body.byteLength > MAX_BYTES) return c.json({ error: 'PDF > 25 MB' }, 413);

  // Verify the upload bytes hash to the claimed canonical_hash. Cheap integrity
  // gate — a malicious uploader can't anchor different content under a hash
  // already on-chain.
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

  // Idempotent: skip rewrite if already there.
  const existing = await c.env.DOCS.head(id);
  if (!existing) {
    await c.env.DOCS.put(id, body, {
      httpMetadata: { contentType: 'application/pdf' },
      customMetadata: {
        filename,
        canonicalHash: expectedHash,
        ownerB58,
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
  return new Response(obj.body, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${filename.replace(/"/g, '')}"`,
      'cache-control': 'public, max-age=300, immutable',
      'access-control-allow-origin': '*',
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
