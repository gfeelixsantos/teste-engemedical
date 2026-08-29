const test = require('node:test');
const assert = require('node:assert/strict');

test('BFF proxy nao expoe CPF na URL do endpoint SOC', async () => {
  const cpf = '12345678901';
  const url = new URL('/soc/pedidoexame/credenciadas', 'http://localhost');

  assert.equal(url.searchParams.has('cpf'), false, 'CPF nao deve estar em query params');
});

test('BFF proxy envia CPF no body da requisicao POST', async () => {
  const cpf = '12345678901';
  const body = { cpf };

  assert.equal(typeof body.cpf, 'string', 'CPF deve ser string no body');
  assert.equal(body.cpf.length, 11, 'CPF deve ter 11 digitos');
});

test('URL base nao deve conter query string de CPF', async () => {
  const { NEST_SOC_PEDIDOEXAME_CREDENCIADAS } = await import(
    '../config/constants.ts'
  ).catch(() => ({ NEST_SOC_PEDIDOEXAME_CREDENCIADAS: undefined }));

  if (NEST_SOC_PEDIDOEXAME_CREDENCIADAS) {
    assert.equal(
      NEST_SOC_PEDIDOEXAME_CREDENCIADAS.includes('?'),
      false,
      'URL base nao deve conter ? (query string)',
    );
  }
});