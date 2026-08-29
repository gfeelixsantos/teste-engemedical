import assert from 'node:assert/strict';
import {
  buildSchedulingTriageReport,
  evaluateBackendEligibility,
} from './triage-aso-processing-queue-lib';

function testFlagsInvalidPayloadForRequeue() {
  const report = buildSchedulingTriageReport({
    schedulingId: 'abc',
    messages: [
      {
        messageId: 'm1',
        payload: {
          schedulingId: 'abc',
          nomeFuncionario: 'Pessoa A',
          codEmpresa: '1',
          codFuncionario: '2',
          sequencial: '3',
          medico: '',
        },
      },
    ],
    mongoDoc: {
      _id: 'abc',
      NOME: 'Pessoa A',
      PARECERMEDICO: 'APTO',
      RECOMENDACAOMEDICA: '',
      TIPOEXAMENOME: 'PERIODICO',
      EXAMES: [{ grupo: 'Exame Clínico', codigoProfissional: '1006' }],
    },
  });

  assert.equal(report.decision, 'DELETE_AND_REQUEUE_FROM_MONGO');
  assert.equal(report.missingFieldsUnion.includes('medico'), true);
}

function testFlagsDuplicatesToKeepLatest() {
  const report = buildSchedulingTriageReport({
    schedulingId: 'abc',
    messages: [
      {
        messageId: 'm-old',
        insertedOn: '2026-05-07T10:00:00.000Z',
        payload: {
          schedulingId: 'abc',
          nomeFuncionario: 'Pessoa A',
          codEmpresa: '1',
          codFuncionario: '2',
          sequencial: '3',
          medico: '1006',
        },
      },
      {
        messageId: 'm-new',
        insertedOn: '2026-05-07T10:05:00.000Z',
        payload: {
          schedulingId: 'abc',
          nomeFuncionario: 'Pessoa A',
          codEmpresa: '1',
          codFuncionario: '2',
          sequencial: '3',
          medico: '1006',
        },
      },
    ],
    mongoDoc: {
      _id: 'abc',
      NOME: 'Pessoa A',
      PARECERMEDICO: 'APTO',
      RECOMENDACAOMEDICA: '',
      TIPOEXAMENOME: 'PERIODICO',
      EXAMES: [{ grupo: 'Exame Clínico', codigoProfissional: '1006' }],
    },
  });

  assert.equal(report.decision, 'DELETE_DUPLICATES_KEEP_LATEST');
  assert.equal(report.canonicalMessageId, 'm-new');
}

function testFlagsSemanticSoapFailureForManualInvestigation() {
  const report = buildSchedulingTriageReport({
    schedulingId: 'abc',
    messages: [
      {
        messageId: 'm1',
        payload: {
          schedulingId: 'abc',
          nomeFuncionario: 'Pessoa A',
          codEmpresa: '1',
          codFuncionario: '2',
          sequencial: '3',
          medico: '1648',
        },
      },
    ],
    mongoDoc: {
      _id: 'abc',
      NOME: 'Pessoa A',
      PARECERMEDICO: 'APTO',
      RECOMENDACAOMEDICA: '',
      TIPOEXAMENOME: 'DEMISSIONAL',
      EXAMES: [{ grupo: 'Exame Clínico', codigoProfissional: '1648' }],
      ASOINFO: {
        error: 'Codigo emissor de aso nao encontrado',
      },
    },
  });

  assert.equal(report.decision, 'INVESTIGATE_MANUALLY');
  assert.equal(
    report.rationale.includes('falha_soap_semantica_registrada'),
    true,
  );
}

function testEvaluatesBackendEligibility() {
  const result = evaluateBackendEligibility({
    PARECERMEDICO: 'APTO',
    RECOMENDACAOMEDICA: '',
    TIPOEXAMENOME: 'PERIODICO',
    EXAMES: [{ grupo: 'Exame Clínico', codigoProfissional: '1006' }],
  });

  assert.equal(result.eligible, true);
  assert.equal(result.clinicalDoctorCode, '1006');
}

function main() {
  testFlagsInvalidPayloadForRequeue();
  testFlagsDuplicatesToKeepLatest();
  testFlagsSemanticSoapFailureForManualInvestigation();
  testEvaluatesBackendEligibility();
  console.log('triage-aso-processing-queue.spec.ts: ok');
}

main();
