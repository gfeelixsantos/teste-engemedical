import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AsoEnriquecimentoMessage } from '../types/aso.types';
import { resolveAsoMetadata } from '../../signature/resolve-aso-metadata';
import { resolveAsoProfessionalCode } from './resolve-aso-professional-code';

const message: AsoEnriquecimentoMessage = {
  commandId: 'cmd-1',
  schedulingId: '1733915',
  url: 'https://cmsodocs.blob.core.windows.net/documents/aso/2026/04/1733915/1733915-143-3-29042026/ASO_1733915_THIAGO.pdf',
  nomeFuncionario: 'THIAGO HENRIQUE MASSOLINI DA COSTA',
  nomeEmpresa: 'INOPLAST FIBRAS INDUSTRIAIS LTDA',
  tipoExame: 'RETORNO AO TRABALHO',
  codEmpresa: '58023342000107',
  medico: '1698',
  observacoesParecer: ['Retornar em 7 dias'],
  credentials: {
    pin: '123456',
  },
  profissional: {
    codigo: '1698',
    nome: 'Amanda de Souza Zanetti',
    cpf: '389.583.238-33',
    perfil: 'MEDICO',
    conselho: '226402',
    ufconselho: 'SP',
  },
  prontuario: '1733915-143-3-29042026',
  createdAt: '2026-04-29T10:05:00.000Z',
};

const conflictingScheduling = {
  CODIGOPRONTUARIO: '1733915-143-3-29042026',
  MEDICO: '1006',
  profissional: {
    codigo: '2001',
  },
};

const professionalCode = resolveAsoProfessionalCode({
  payloadMedico: message.medico,
  exameClinico: {
    codigoProfissional: '3002',
  },
  scheduling: conflictingScheduling,
});

assert.equal(
  professionalCode,
  '1698',
  'worker deve priorizar o medico informado pelo payload do backend/aso-generate',
);

const metadata = resolveAsoMetadata({
  payloadProfessional: message.profissional,
  scheduling: {
    CODIGOPRONTUARIO: conflictingScheduling.CODIGOPRONTUARIO,
    MEDICO: 'Amanda de Souza Zanetti',
  },
  trimmedId: message.schedulingId,
});

assert.deepEqual(metadata, {
  professionalName: 'Amanda de Souza Zanetti',
  crm: '226402',
  uf: 'SP',
  cpf: '389.583.238-33',
  prontuario: '1733915-143-3-29042026',
});

const workerServiceSource = readFileSync(
  join(__dirname, 'azure-aso-enrichment.service.ts'),
  'utf-8',
);

assert.equal(
  workerServiceSource.includes("'ASOINFO.status': 'PROCESSANDO'"),
  false,
  'worker nao deve mais promover status PROCESSANDO direto no Mongo',
);
assert.equal(
  workerServiceSource.includes("'ASOINFO.status': 'ERRO'"),
  false,
  'worker nao deve mais persistir status ERRO fora do backend',
);

console.log(
  'OK worker contract: payload do aso-generate preserva medico/profissional e o worker nao atualiza ASOINFO direto',
);
