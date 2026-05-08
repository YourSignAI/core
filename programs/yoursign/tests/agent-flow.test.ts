// E2E flow against `solana-bankrun`: register_agent → attest_agent_action → revoke.
// Stub bodies — wired up Sprint 2 Thursday once `anchor build` produces the IDL.
//
// Why we keep the stubs in: the test names are part of the spec contract. If
// CI reports "skipped: register_agent rejects expired delegation", that's still
// information the verifier loop uses. Real assertions land alongside the IDL.

import { describe, it } from 'vitest';

describe('register_agent (ADR-0007)', () => {
  it.skip('writes AgentDelegation with status=Active given a valid principal sig', async () => {});
  it.skip('rejects expires_at > now + 30d', async () => {});
  it.skip('rejects when ed25519 sibling ix is missing', async () => {});
  it.skip('rejects when ed25519 sibling ix message bytes differ', async () => {});
  it.skip('rejects PDA collision on (principal, nonce)', async () => {});
});

describe('attest_agent_action (ADR-0007)', () => {
  it.skip('writes AgentAction when delegation is Active and tool is in scope', async () => {});
  it.skip('returns DelegationRevoked once delegation.status=Revoked', async () => {});
  it.skip('returns DelegationExpired and lazy-flips status when expires_at <= now', async () => {});
  it.skip('returns ToolNotInManifest for unknown tool ids', async () => {});
  it.skip('returns ToolDisabled when manifest entry has enabled=false', async () => {});
  it.skip('returns SpendCapExceeded if spend>0 without principal witness sig', async () => {});
  it.skip('requires a co-tx attest_signature ix when action_kind=SignDocument', async () => {});
});

describe('revoke_delegation (ADR-0007)', () => {
  it.skip('flips status to Revoked when principal signs canonical revoke message', async () => {});
  it.skip('rejects double-revoke with AlreadyRevoked', async () => {});
  it.skip('rejects when caller != delegation.principal', async () => {});
  it.skip('makes subsequent attest_agent_action fail with DelegationRevoked at next slot', async () => {});
});
