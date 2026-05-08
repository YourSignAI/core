// Cloudflare Queues consumer. Wakes up on `anchor-document` / `anchor-signature`
// messages, builds + submits the corresponding Anchor ix, retries with backoff.
//
// Stub: Sprint 2 Thursday wires `@solana/web3.js` + `@coral-xyz/anchor` against
// the deployed program ID. For now, this is the contract surface so producers
// (apps/api) can enqueue against a stable shape.

import type { Env, AnchorJobMessage } from './env.js';

export default {
  async fetch(_req: Request, _env: Env): Promise<Response> {
    return new Response('yoursign-worker (consumer-only; use bindings)', { status: 200 });
  },

  async queue(batch: MessageBatch<AnchorJobMessage>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        switch (msg.body.kind) {
          case 'anchor-document':
            console.log('TODO anchor-document', msg.body, env.PROGRAM_ID);
            break;
          case 'anchor-signature':
            console.log('TODO anchor-signature', msg.body, env.PROGRAM_ID);
            break;
        }
        msg.ack();
      } catch (err) {
        console.error('worker job failed', err);
        msg.retry();
      }
    }
  },
};
