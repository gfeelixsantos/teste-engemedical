const assert = require('node:assert/strict');
const {
  getAsoProcessingEligibilityError,
} = require('./aso-processing-eligibility');
export {};

function testAcceptsValidExecutionPayload() {
  assert.equal(
    getAsoProcessingEligibilityError({
      schedulingId: 'abc123',
      sequencial: '77',
      codEmpresa: '991254',
      codFuncionario: '143',
      medico: '1698',
    }),
    null,
  );
}

function testRejectsMissingSchedulingId() {
  assert.equal(
    getAsoProcessingEligibilityError({
      sequencial: '77',
      codEmpresa: '991254',
      codFuncionario: '143',
      medico: '1698',
    }),
    'Payload invalido para processamento tecnico do ASO: campo obrigatorio ausente: schedulingId',
  );
}

function testRejectsMissingDoctor() {
  assert.equal(
    getAsoProcessingEligibilityError({
      schedulingId: 'abc123',
      sequencial: '77',
      codEmpresa: '991254',
      codFuncionario: '143',
      medico: '',
    }),
    'Payload invalido para processamento tecnico do ASO: campo obrigatorio ausente: medico',
  );
}

function testRejectsDoctorNameInsteadOfNumericCode() {
  assert.equal(
    getAsoProcessingEligibilityError({
      schedulingId: 'abc123',
      sequencial: '77',
      codEmpresa: '991254',
      codFuncionario: '143',
      medico: 'Dra. Andrea Cristina Defina do Amaral',
    }),
    'Payload invalido para processamento tecnico do ASO: medico deve ser um codigo numerico',
  );
}

function main() {
  testAcceptsValidExecutionPayload();
  testRejectsMissingSchedulingId();
  testRejectsMissingDoctor();
  testRejectsDoctorNameInsteadOfNumericCode();
  console.log('aso-processing-eligibility.spec.ts: ok');
}

main();
