import type { AgentScope } from '@yoursign/agent-sdk';

export function ScopePreview({ scope, agentLabel }: { scope: AgentScope; agentLabel: string }) {
  const docs =
    scope.documents === 'any'
      ? 'qualquer documento'
      : 'hashes' in scope.documents
        ? `${scope.documents.hashes.length} doc(s) específicos`
        : `workspace ${scope.documents.workspaceId}`;
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200">
      <div className="mb-2 font-medium text-zinc-50">Você está autorizando: {agentLabel}</div>
      <ul className="space-y-1">
        <li>Ferramentas: <code>{[...scope.tools].sort().join(', ')}</code></li>
        <li>Documentos: {docs}</li>
        <li>Limite de gasto: {scope.spendCapMicroUsdc === 0 ? 'apenas leitura' : `${(scope.spendCapMicroUsdc / 1_000_000).toFixed(2)} USDC`}</li>
        <li>Expira em: {new Date(scope.expiresAt).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC</li>
      </ul>
      <p className="mt-3 text-xs text-zinc-500">
        Você pode revogar essa permissão a qualquer momento. A revogação fica registrada on-chain.
      </p>
    </div>
  );
}
