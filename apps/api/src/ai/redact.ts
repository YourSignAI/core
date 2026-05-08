// ADR-0008 §Privacy. Redact Brazilian PII before forwarding to AI Gateway.
// Order matters: longer patterns (CPF/CNPJ) first; emails before phones.

const PATTERNS: { re: RegExp; with: string }[] = [
  // CNPJ: 12.345.678/0001-95 or 12345678000195
  { re: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, with: '<doc-id>' },
  // CPF: 123.456.789-00 or 12345678900
  { re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, with: '<doc-id>' },
  // Email
  { re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, with: '<email>' },
  // Brazilian phone: +55 (11) 91234-5678 / variants
  { re: /\+?55\s?\(?\d{2}\)?\s?9?\d{4}-?\d{4}/g, with: '<phone>' },
];

export function redact(text: string): string {
  let out = text;
  for (const p of PATTERNS) out = out.replace(p.re, p.with);
  return out;
}
