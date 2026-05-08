// @yoursign/agent-sdk — public surface.
// Spec: docs/01-spec.md §10. ADR: docs/adr/0007-agent-identity-model.md.

export {
  AgentScopeSchema,
  TOOL_IDS,
  canonicalScopeJson,
  hashScope,
} from './scope.js';
export type { AgentScope, ToolId } from './scope.js';

export {
  canonicalDelegationMessage,
  canonicalActionMessage,
  canonicalRevokeMessage,
  hashMessage,
} from './messages.js';
export type {
  DelegationMessageInput,
  ActionMessageInput,
  RevokeMessageInput,
} from './messages.js';

export { signMessageHash, verifyMessageHash } from './signing.js';

export const AGENT_SDK_VERSION = '0.1.0';
