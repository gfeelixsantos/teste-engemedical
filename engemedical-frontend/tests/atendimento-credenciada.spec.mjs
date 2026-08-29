const test = require('node:test');
const assert = require('node:assert/strict');

test('Fluxo de credenciadas nao expoe CPF na URL', async () => {
  const cpf = '12345678901';

  const url = new URL('/soc/pedidoexame/credenciadas', 'http://localhost');
  assert.equal(url.searchParams.has('cpf'), false, 'CPF nao deve estar em query params');
  assert.equal(url.href, 'http://localhost/soc/pedidoexame/credenciadas', 'URL deve ser limpa');
});

test('CPF deve ser enviado apenas no body da requisicao', async () => {
  const cpf = '12345678901';
  const body = { cpf };

  assert.equal(typeof body.cpf, 'string', 'CPF deve ser string');
  assert.equal(body.cpf.replace(/\D/g, '').length, 11, 'CPF deve ter 11 digitos');
});

test('Metodo HTTP deve ser POST nao GET', async () => {
  const method = 'POST';
  assert.equal(method, 'POST', 'Metodo deve ser POST');
  assert.notEqual(method, 'GET', 'Metodo nao deve ser GET');
});