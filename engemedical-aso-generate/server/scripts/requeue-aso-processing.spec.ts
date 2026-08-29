import assert from 'node:assert/strict';
import {
  buildAsoRequeuePayload,
  getMissingRequiredFields,
  isAsoEligibleForProcessing,
  isPendingMongoAsoCandidate,
} from './requeue-aso-processing-lib';

function testBuildsPayloadWithProfessionalSnapshot() {
  const payload = buildAsoRequeuePayload({
    _id: '6818f6ee8fd9af86a0fd0001',
    NOME: 'Senhorinha Pedroso Ortiz',
    NOMEEMPRESA: 'Empresa Exemplo',
    TIPOEXAME: '1',
    TIPOEXAMENOME: 'ADMISSIONAL',
    DATAAGENDAMENTO: '29/04/2026',
    CODIGOEMPRESA: '991254',
    CODIGO: '143',
    CPFFUNCIONARIO: '12345678900',
    PARECERMEDICO: 'APTO',
    CODIGOPRONTUARIO: '991254-143-1-28042026',
    SEQUENCIAFICHA: '77',
    MEDICO: '1698',
    ASOINFO: {
      observacoesParecer: ['Obs 1'],
      credentials: { pin: 'abc' },
      professional: {
        codigo: '1698',
        nome: 'Amanda de Souza Zanetti',
        cpf: '38958323833',
        conselho: '226402',
        ufconselho: 'SP',
      },
    },
  });

  assert.equal(payload.schedulingId, '6818f6ee8fd9af86a0fd0001');
  assert.equal(payload.nomeFuncionario, 'Senhorinha Pedroso Ortiz');
  assert.equal(payload.codEmpresa, '991254');
  assert.equal(payload.medico, '1698');
  assert.equal(payload.action, 'REPROCESSAR');
  assert.deepEqual(payload.observacoesParecer, ['Obs 1']);
  assert.deepEqual(payload.credentials, { pin: 'abc' });
  assert.deepEqual(payload.profissional, {
    codigo: '1698',
    nome: 'Amanda de Souza Zanetti',
    cpf: '38958323833',
    conselho: '226402',
    ufconselho: 'SP',
  });
}

function testFallsBackToClinicalExamDoctor() {
  const payload = buildAsoRequeuePayload({
    _id: '6818f6ee8fd9af86a0fd0002',
    NOME: 'Everton Leonardo Aguos',
    NOMEEMPRESA: 'Empresa Exemplo',
    TIPOEXAME: '2',
    TIPOEXAMENOME: 'PERIODICO',
    DATAAGENDAMENTO: '23/04/2026',
    CODIGOEMPRESA: '310538',
    CODIGO: '1819',
    CPFFUNCIONARIO: '12345678900',
    PARECERMEDICO: 'APTO',
    CODIGOPRONTUARIO: '310538-1819-2-23042026',
    SEQUENCIAFICHA: '351449840',
    MEDICO: null,
    ASOINFO: { status: 'FALHA' },
    EXAMES: [
      {
        grupo: 'Exame Clínico',
        codigoProfissional: '1006',
        formulario: {
          codigoMedico: '1006',
        },
      },
    ],
  });

  assert.equal(payload.medico, '1006');
}

function testNeverUsesDoctorNameAsFallback() {
  const payload = buildAsoRequeuePayload({
    _id: '6818f6ee8fd9af86a0fd0004',
    NOME: 'Joao Carlos dos Santos',
    NOMEEMPRESA: 'Empresa Exemplo',
    TIPOEXAME: '2',
    TIPOEXAMENOME: 'PERIODICO',
    DATAAGENDAMENTO: '14/05/2026',
    CODIGOEMPRESA: '1975773',
    CODIGO: '396',
    CPFFUNCIONARIO: '12345678900',
    PARECERMEDICO: 'APTO',
    CODIGOPRONTUARIO: '1975773-396-2-14052026',
    SEQUENCIAFICHA: '342805099',
    MEDICO: 'Dra. Andrea Cristina Defina do Amaral',
    ASOINFO: {
      professional: {
        nome: 'Dra. Andrea Cristina Defina do Amaral',
      },
    },
  });

  assert.equal(payload.medico, '');
  assert.deepEqual(getMissingRequiredFields(payload), ['medico']);
}

function testReportsMissingRequiredFields() {
  const payload = buildAsoRequeuePayload({
    _id: '6818f6ee8fd9af86a0fd0003',
    NOME: 'Everton Leonardo Aguos',
    NOMEEMPRESA: 'Empresa Exemplo',
    TIPOEXAME: '2',
    TIPOEXAMENOME: 'PERIODICO',
    DATAAGENDAMENTO: '23/04/2026',
    CODIGOEMPRESA: '',
    CODIGO: '1819',
    CPFFUNCIONARIO: '12345678900',
    PARECERMEDICO: 'APTO',
    CODIGOPRONTUARIO: '310538-1819-2-23042026',
    SEQUENCIAFICHA: '351449840',
    MEDICO: null,
    ASOINFO: { status: 'FALHA' },
  });

  assert.deepEqual(getMissingRequiredFields(payload), [
    'codEmpresa',
    'medico',
  ]);
}

function testRejectsNonAptoAsoForProcessing() {
  assert.equal(
    isAsoEligibleForProcessing({
      PARECERMEDICO: 'INAPTO_TEMPORARIAMENTE',
      RECOMENDACAOMEDICA: '',
      TIPOEXAMENOME: 'PERIODICO',
    }),
    false,
  );
  assert.equal(
    isAsoEligibleForProcessing({
      PARECERMEDICO: 'APTO',
      RECOMENDACAOMEDICA: 'Retornar em 30 dias',
      TIPOEXAMENOME: 'PERIODICO',
    }),
    false,
  );
  assert.equal(
    isAsoEligibleForProcessing({
      PARECERMEDICO: 'APTO',
      RECOMENDACAOMEDICA: '',
      TIPOEXAMENOME: 'PERIODICO',
    }),
    true,
  );
  assert.equal(
    isAsoEligibleForProcessing({
      PARECERMEDICO: 'APTO',
      RECOMENDACAOMEDICA: '',
      TIPOEXAMENOME: 'PERIODICO',
      ASOINFO: { status: 'LIBERADO' },
    }),
    false,
  );
  assert.equal(
    isAsoEligibleForProcessing({
      PARECERMEDICO: 'APTO',
      RECOMENDACAOMEDICA: '',
      TIPOEXAMENOME: 'PERIODICO',
      ASOSTATUS: 'LIBERADO',
    }),
    false,
  );
  assert.equal(
    isAsoEligibleForProcessing({
      PARECERMEDICO: 'APTO',
      RECOMENDACAOMEDICA: '',
      TIPOEXAMENOME: 'PERIODICO',
      ASOINFO: { status: 'DIGITALIZADA', url: 'https://blob/aso.pdf' },
    }),
    false,
  );
}

function testSelectsPendingMongoCandidates() {
  assert.equal(
    isPendingMongoAsoCandidate(
      {
        PARECERMEDICO: 'APTO',
        RECOMENDACAOMEDICA: '',
        TIPOEXAMENOME: 'PERIODICO',
        ASOINFO: { status: 'PENDENTE', url: '' },
      },
      new Set(['PENDENTE', 'FALHA']),
    ),
    true,
  );
  assert.equal(
    isPendingMongoAsoCandidate(
      {
        PARECERMEDICO: 'APTO',
        RECOMENDACAOMEDICA: '',
        TIPOEXAMENOME: 'PERIODICO',
        ASOINFO: { status: 'DIGITALIZADA', url: '' },
      },
      new Set(['PENDENTE', 'FALHA']),
    ),
    false,
  );
  assert.equal(
    isPendingMongoAsoCandidate(
      {
        PARECERMEDICO: 'APTO',
        RECOMENDACAOMEDICA: '',
        TIPOEXAMENOME: 'PERIODICO',
        ASOINFO: { status: 'FALHA', url: 'https://example.com/doc.pdf' },
      },
      new Set(['PENDENTE', 'FALHA']),
    ),
    false,
  );
}

function main() {
  testBuildsPayloadWithProfessionalSnapshot();
  testFallsBackToClinicalExamDoctor();
  testNeverUsesDoctorNameAsFallback();
  testReportsMissingRequiredFields();
  testRejectsNonAptoAsoForProcessing();
  testSelectsPendingMongoCandidates();
  console.log('requeue-aso-processing.spec.ts: ok');
}

main();
