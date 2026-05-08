#!/usr/bin/env node
// AC-5.2.1 — CLI parity with the verifier site.
//
// Usage:
//   yoursign-verify <docId> --pdf path.pdf [--cluster mainnet|devnet]
//
// Stub: full impl in Sprint 3 Thursday once Light Protocol read path lands.

const args = process.argv.slice(2);
const docId = args[0];
const pdfFlagIdx = args.indexOf('--pdf');
const pdfPath = pdfFlagIdx >= 0 ? args[pdfFlagIdx + 1] : undefined;
const clusterFlagIdx = args.indexOf('--cluster');
const cluster = clusterFlagIdx >= 0 ? args[clusterFlagIdx + 1] : 'devnet';

if (!docId || !pdfPath) {
  console.error('Usage: yoursign-verify <docId> --pdf path.pdf [--cluster mainnet|devnet]');
  process.exit(2);
}

console.log(JSON.stringify({
  status: 'awaiting_implementation',
  docId,
  pdfPath,
  cluster,
  note: 'Sprint 3 Thursday lands the Light Protocol read path.',
}));
