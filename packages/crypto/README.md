# `@yoursign/crypto`

Cryptographic primitives. Browser- and Node-compatible.

## Public API (target)

```ts
export function sha256(bytes: Uint8Array): Promise<string>           // hex
export function generateDek(): Promise<CryptoKey>                    // AES-256-GCM
export function aesGcmSeal(dek: CryptoKey, plaintext: Uint8Array): Promise<Uint8Array>
export function aesGcmOpen(dek: CryptoKey, ciphertext: Uint8Array): Promise<Uint8Array>

export function ed25519PubToX25519Pub(pub: Uint8Array): Uint8Array
export function ed25519SecretToX25519Secret(sec: Uint8Array): Uint8Array
export function x25519Wrap(dek: Uint8Array, recipientPub: Uint8Array, ourSecret?: Uint8Array): Promise<WrappedDek>
export function x25519Unwrap(wrapped: WrappedDek, recipientSecret: Uint8Array): Promise<Uint8Array>

export function ed25519Verify(sig: Uint8Array, msg: Uint8Array, pub: Uint8Array): Promise<boolean>

export function buildSigningMessage(args: SigningMessageArgs): Uint8Array  // canonical bytes
```

## Why libsodium

- Audited, time-tested.
- Uniform browser/Node API via `libsodium-wrappers`.
- Owns the Ed25519↔X25519 conversion we rely on (ADR-0004).

## Spec refs

AC-3.*, AC-4.1.*, AC-5.* (verification path).

## Hard rules (enforced by Verifier)

- No raw-key logging. Ever.
- No Math.random for keys. WebCrypto / sodium randomness only.
- No backwards-compat code paths that downgrade key strength.

## Status

Stub. Phase 3.
