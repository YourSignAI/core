'use client';

import { useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  AgentScopeSchema,
  canonicalDelegationMessage,
  hashScope,
  type AgentScope,
} from '@yoursign/agent-sdk';

function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function randomNonceHex(): string {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return bytesToHex(a);
}

function defaultScope(): AgentScope {
  const expires = new Date(Date.now() + 24 * 3600 * 1000);
  expires.setMilliseconds(0);
  return {
    tools: ['sign_document', 'verify'],
    documents: 'any',
    spendCapMicroUsdc: 0,
    expiresAt: expires.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
}

export function DelegateForm() {
  const { publicKey, signMessage, connected } = useWallet();
  const [agentB58, setAgentB58] = useState('');
  const [scope, setScope] = useState<AgentScope>(defaultScope);
  const [signing, setSigning] = useState(false);
  const [result, setResult] = useState<{
    messageHashHex: string;
    scopeHashHex: string;
    signatureHex: string;
    scopeUri?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const principalB58 = publicKey?.toBase58() ?? '';
  const scopeHashHex = useMemo(() => {
    try {
      const v = AgentScopeSchema.parse(scope);
      return bytesToHex(hashScope(v));
    } catch {
      return '';
    }
  }, [scope]);

  async function onDelegate() {
    if (!signMessage || !publicKey) {
      setError('Conecte uma carteira primeiro.');
      return;
    }
    if (!agentB58) {
      setError('Informe o pubkey do agente.');
      return;
    }
    setError(null);
    setSigning(true);
    try {
      const docs =
        scope.documents === 'any'
          ? 'any'
          : 'hashes' in scope.documents
            ? `hashes: ${[...scope.documents.hashes].sort().join(',')}`
            : `workspace: ${scope.documents.workspaceId}`;
      const nonce = randomNonceHex();
      const message = canonicalDelegationMessage({
        principal: principalB58,
        agent: agentB58,
        tools: scope.tools,
        documentsClause: docs,
        spendCapMicroUsdc: scope.spendCapMicroUsdc,
        expiresAt: scope.expiresAt,
        nonce,
      });
      const sigBytes = await signMessage(new TextEncoder().encode(message));
      const msgHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(message),
      );
      // Anchor scope JSON in R2 via apps/api so verifier site can re-hash it.
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8787';
      let scopeUri = '';
      try {
        const r = await fetch(`${apiUrl}/agents/scope`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ workspaceId: 'demo-ws', scope }),
        });
        if (r.ok) scopeUri = (await r.json() as { scopeUri: string }).scopeUri;
      } catch {
        // local dev w/o api running — skip silently
      }
      setResult({
        messageHashHex: bytesToHex(new Uint8Array(msgHash)),
        scopeHashHex,
        signatureHex: bytesToHex(sigBytes),
        scopeUri,
      });
      // TODO once program deployed devnet: build register_agent ix tx +
      // ed25519_program sibling ix from these inputs; submit via @solana/web3.js.
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'falha desconhecida');
    } finally {
      setSigning(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>
          Agente (pubkey base58)
        </label>
        <input
          value={agentB58}
          onChange={(e) => setAgentB58(e.target.value.trim())}
          placeholder="cole o pubkey do MCP / agente"
          style={{
            width: '100%',
            border: '1px solid var(--hairline)',
            borderRadius: 8,
            padding: '12px 14px',
            fontSize: 14,
            color: 'var(--ink)',
            background: 'var(--canvas)',
            outline: 'none',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ink)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--hairline)')}
        />
      </div>

      <ScopePreviewLight scope={scope} agentLabel={agentB58 || 'agente sem identidade'} />

      <div style={{ fontSize: 12, color: 'var(--ash)', fontFamily: 'var(--font-mono)' }}>
        scope_hash: <span style={{ color: 'var(--ink)' }}>{scopeHashHex || '—'}</span>
      </div>

      <button
        onClick={onDelegate}
        disabled={!connected || signing}
        className="btn btn-primary btn-lg"
        style={{ width: '100%' }}
      >
        {signing ? 'Aguardando carteira…' : 'Assinar e delegar'}
      </button>

      {!connected ? (
        <p style={{ fontSize: 13, color: 'var(--ash)', textAlign: 'center', margin: 0 }}>
          Conecte uma carteira para assinar a delegação.
        </p>
      ) : null}

      {error ? (
        <p style={{ fontSize: 13, color: 'var(--error)', margin: 0 }}>{error}</p>
      ) : null}

      {result ? (
        <pre style={{
          background: 'var(--cloud)',
          border: '1px solid var(--hairline)',
          borderRadius: 8,
          padding: 16,
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--ink)',
          overflowX: 'auto',
          margin: 0,
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function ScopePreviewLight({ scope, agentLabel }: { scope: AgentScope; agentLabel: string }) {
  const docs =
    scope.documents === 'any'
      ? 'qualquer documento'
      : 'hashes' in scope.documents
        ? `${scope.documents.hashes.length} doc(s) específicos`
        : `workspace ${scope.documents.workspaceId}`;
  return (
    <div style={{
      background: 'var(--cloud)',
      border: '1px solid var(--hairline)',
      borderRadius: 10,
      padding: 16,
      fontSize: 14,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>
        Você está autorizando: {agentLabel}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <li><span style={{ color: 'var(--ash)' }}>Ferramentas: </span>
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{[...scope.tools].sort().join(', ')}</code>
        </li>
        <li><span style={{ color: 'var(--ash)' }}>Documentos: </span>{docs}</li>
        <li><span style={{ color: 'var(--ash)' }}>Limite de gasto: </span>
          {scope.spendCapMicroUsdc === 0 ? 'apenas leitura' : `${(scope.spendCapMicroUsdc / 1_000_000).toFixed(2)} USDC`}
        </li>
        <li><span style={{ color: 'var(--ash)' }}>Expira em: </span>
          {new Date(scope.expiresAt).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC
        </li>
      </ul>
      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--ash)' }}>
        Você pode revogar essa permissão a qualquer momento. A revogação fica registrada on-chain.
      </p>
    </div>
  );
}
