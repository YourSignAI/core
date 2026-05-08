// @yoursign/crypto — sensitive. See ADR-0004 + CLAUDE.md.

export { canonicalSigningMessage } from './signing-message.js';
export type { SigningMessageInput } from './signing-message.js';

export { hash256, sign, verify } from './ed25519.js';

export { generateDek, seal, open } from './aead.js';
export type { SealedDocument } from './aead.js';

export { wrapDek, unwrapDek } from './wrap.js';
export type { WrappedKey } from './wrap.js';

export const CRYPTO_VERSION = '0.1.0';
