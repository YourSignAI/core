import { describe, expect, it } from 'vitest';
import { redact } from '../src/ai/redact.js';

describe('redact', () => {
  it('email -> <email>', () => {
    expect(redact('contact me at jane.doe+x@example.co.br')).toBe('contact me at <email>');
  });
  it('CPF formatted -> <doc-id>', () => {
    expect(redact('CPF 123.456.789-00 ok')).toBe('CPF <doc-id> ok');
  });
  it('CPF unformatted -> <doc-id>', () => {
    expect(redact('cpf 12345678900')).toBe('cpf <doc-id>');
  });
  it('CNPJ -> <doc-id>', () => {
    expect(redact('CNPJ 12.345.678/0001-95')).toBe('CNPJ <doc-id>');
  });
  it('phone +55 (11) 91234-5678 -> <phone>', () => {
    expect(redact('whatsapp +55 (11) 91234-5678')).toBe('whatsapp <phone>');
  });
});
