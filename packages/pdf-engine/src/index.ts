// AC-1.2.1 — canonical PDF + SHA-256 hash. Sprint 1 lands the real
// canonicalization (strip /ID, /CreationDate, /ModDate, set deterministic
// /Producer). Stub here so apps/web + apps/verifier can import a stable signature.

export type CanonicalResult = {
  hashHex: string;
  byteLength: number;
};

export async function canonicalize(input: ArrayBuffer | Uint8Array): Promise<CanonicalResult> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  // Copy into a fresh ArrayBuffer to satisfy TS 5.7 strict BufferSource typing
  // (Uint8Array<ArrayBufferLike> can be SharedArrayBuffer-backed; subtle.digest
  // requires plain ArrayBuffer).
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', ab);
  const hashHex = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  return { hashHex, byteLength: bytes.byteLength };
}

export const PDF_ENGINE_VERSION = '0.1.0';
