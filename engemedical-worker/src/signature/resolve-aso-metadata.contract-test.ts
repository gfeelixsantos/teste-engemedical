import { strict as assert } from 'node:assert';

import { resolveAsoMetadata } from './resolve-aso-metadata';

const payloadResult = resolveAsoMetadata({
  payloadProfessional: {
    codigo: '1698',
    nome: 'Amanda de Souza Zanetti',
    cpf: '389.583.238-33',
    conselho: '226402',
    ufconselho: 'SP',
  },
  scheduling: {
    CODIGOPRONTUARIO: '1733915-143-3-29042026',
    MEDICO: 'Amanda de Souza Zanetti',
  },
  trimmedId: '1733915',
});

assert.deepEqual(payloadResult, {
  professionalName: 'Amanda de Souza Zanetti',
  crm: '226402',
  uf: 'SP',
  cpf: '389.583.238-33',
  prontuario: '1733915-143-3-29042026',
});

const asoInfoResult = resolveAsoMetadata({
  asoProfessional: {
    codigo: '1698',
    nome: 'Amanda de Souza Zanetti',
    cpf: '389.583.238-33',
    conselho: '226402',
    ufconselho: 'SP',
  },
  scheduling: {
    CODIGOPRONTUARIO: '1733915-143-3-29042026',
    MEDICO: 'Amanda de Souza Zanetti',
  },
  trimmedId: '1733915',
});

assert.deepEqual(asoInfoResult, {
  professionalName: 'Amanda de Souza Zanetti',
  crm: '226402',
  uf: 'SP',
  cpf: '389.583.238-33',
  prontuario: '1733915-143-3-29042026',
});

const mergedResult = resolveAsoMetadata({
  payloadProfessional: {
    codigo: '1698',
    nome: 'Amanda de Souza Zanetti',
  },
  asoProfessional: {
    codigo: '1698',
    nome: 'Amanda de Souza Zanetti',
    cpf: '389.583.238-33',
    conselho: '226402',
    ufconselho: 'SP',
  },
  scheduling: {
    CODIGOPRONTUARIO: '1733915-143-3-29042026',
    MEDICO: 'Amanda de Souza Zanetti',
  },
  trimmedId: '1733915',
});

assert.deepEqual(mergedResult, {
  professionalName: 'Amanda de Souza Zanetti',
  crm: '226402',
  uf: 'SP',
  cpf: '389.583.238-33',
  prontuario: '1733915-143-3-29042026',
});

const fallbackResult = resolveAsoMetadata({
  payloadProfessional: {
    codigo: '1698',
    nome: 'Amanda de Souza Zanetti',
  },
  clinicalProfessionalData: {
    cpf: '38958323833',
    conselho: '226402',
    ufconselho: 'SP',
  },
  dbUser: {
    nome: 'Amanda de Souza Zanetti',
    cpf: '389.583.238-33',
    crm: '226402',
    uf: 'SP',
  },
  scheduling: {
    CODIGOPRONTUARIO: '991254-493-1-28042026',
    MEDICO: 'Amanda de Souza Zanetti',
  },
  trimmedId: '991254',
});

assert.equal(fallbackResult.professionalName, 'Amanda de Souza Zanetti');
assert.equal(fallbackResult.crm, '226402');
assert.equal(fallbackResult.uf, 'SP');
assert.equal(fallbackResult.cpf, '38958323833');
assert.equal(fallbackResult.prontuario, '991254-493-1-28042026');

const emptyResult = resolveAsoMetadata({
  scheduling: {},
  trimmedId: 'abc',
});

assert.equal(emptyResult.professionalName, 'N/D');
assert.equal(emptyResult.crm, '');
assert.equal(emptyResult.uf, '');
assert.equal(emptyResult.cpf, '');
assert.equal(emptyResult.prontuario, 'abc');

console.log(
  'OK resolveAsoMetadata prioriza payload/ASOINFO e evita N/D quando há fonte válida',
);
