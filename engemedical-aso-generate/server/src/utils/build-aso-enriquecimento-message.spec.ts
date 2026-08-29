import assert from 'node:assert/strict';

import { buildAsoEnriquecimentoMessage } from './build-aso-enriquecimento-message';
import { AsoProcessingMessage } from '../web/types';
import { CertificateStatus } from '../CertificateStatus';

const item: AsoProcessingMessage = {
  commandId: 'cmd-1',
  schedulingId: '1733915',
  sequencial: '143',
  nomeFuncionario: 'THIAGO HENRIQUE MASSOLINI DA COSTA',
  nomeEmpresa: 'INOPLAST FIBRAS INDUSTRIAIS LTDA',
  tipoExame: '3',
  tipoExameNome: 'RETORNO AO TRABALHO',
  dataFicha: '29/04/2026',
  codEmpresa: '58023342000107',
  codFuncionario: '123',
  cpfFuncionario: '00000000000',
  medico: '1698',
  prontuario: '1733915-143-3-29042026',
  socgedCode: '',
  status: CertificateStatus.Pendente,
  created: '2026-04-29T10:00:00.000Z',
  updated: '2026-04-29T10:00:00.000Z',
  observacoesParecer: ['Retornar em 7 dias'],
  credentials: {
    pin: '123456',
  },
  profissional: {
    codigo: '1698',
    nome: 'Amanda de Souza Zanetti',
    cpf: '389.583.238-33',
    conselho: '226402',
    ufconselho: 'SP',
  },
};

const message = buildAsoEnriquecimentoMessage({
  item,
  blobUrl:
    'https://cmsodocs.blob.core.windows.net/documents/aso/2026/04/1733915/1733915-143-3-29042026/ASO_1733915_THIAGO.pdf',
  createdAt: '2026-04-29T10:05:00.000Z',
});

assert.equal(message.commandId, 'cmd-1');
assert.equal(message.schedulingId, '1733915');
assert.equal(message.nomeFuncionario, 'THIAGO HENRIQUE MASSOLINI DA COSTA');
assert.equal(message.nomeEmpresa, 'INOPLAST FIBRAS INDUSTRIAIS LTDA');
assert.equal(message.tipoExame, 'RETORNO AO TRABALHO');
assert.equal(message.medico, '1698');
assert.deepEqual(message.observacoesParecer, ['Retornar em 7 dias']);
assert.deepEqual(message.credentials, { pin: '123456' });
assert.deepEqual(message.profissional, {
  codigo: '1698',
  nome: 'Amanda de Souza Zanetti',
  cpf: '389.583.238-33',
  conselho: '226402',
  ufconselho: 'SP',
});

console.log(
  'OK buildAsoEnriquecimentoMessage preserva profissional e credenciais',
);
