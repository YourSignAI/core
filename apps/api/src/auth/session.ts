// HMAC-signed session token for the SIWS-issued session.
// Lives 24h (per ADR-0006). Refresh requires a fresh SIWS sig.

const SESSION_TTL_SECS = 24 * 3600;

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replaceAll('-', '+').replaceAll('_', '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    fromB64url(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export type SessionClaims = {
  sub: string;          // pubkey b58
  iat: number;
  exp: number;
};

export async function issueSession(secret: string, pubkeyB58: string): Promise<string> {
  const claims: SessionClaims = {
    sub: pubkeyB58,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECS,
  };
  const payload = b64url(new TextEncoder().encode(JSON.stringify(claims)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)),
  );
  return `${payload}.${b64url(sig)}`;
}

export async function verifySession(secret: string, token: string): Promise<SessionClaims | null> {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    'HMAC',
    key,
    fromB64url(sig),
    new TextEncoder().encode(payload),
  );
  if (!ok) return null;
  const claims = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as SessionClaims;
  if (claims.exp < Math.floor(Date.now() / 1000)) return null;
  return claims;
}
