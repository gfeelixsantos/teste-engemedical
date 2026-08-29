import { strict as assert } from 'node:assert';

import { determineAsoCallbackStatus } from './aso-callback-status';

assert.equal(
  determineAsoCallbackStatus({
    professionalCode: '1698',
    signatureEnabled: true,
    signatureStatus: 'LIBERADO',
    hasEmbeddedSignature: true,
    itiValidationRequired: false,
  }),
  'LIBERADO',
);

assert.equal(
  determineAsoCallbackStatus({
    professionalCode: '1698',
    signatureEnabled: true,
    signatureStatus: 'PENDENTE',
    hasEmbeddedSignature: true,
    itiValidationRequired: false,
  }),
  'PENDENTE',
);

assert.equal(
  determineAsoCallbackStatus({
    professionalCode: '1698',
    signatureEnabled: false,
    signatureStatus: 'LIBERADO',
    hasEmbeddedSignature: true,
    itiValidationRequired: false,
  }),
  'PENDENTE',
);

assert.equal(
  determineAsoCallbackStatus({
    professionalCode: '',
    signatureEnabled: true,
    signatureStatus: 'LIBERADO',
    hasEmbeddedSignature: true,
    itiValidationRequired: false,
  }),
  'PENDENTE',
);

assert.equal(
  determineAsoCallbackStatus({
    professionalCode: '1698',
    signatureEnabled: true,
    signatureStatus: 'LIBERADO',
    hasEmbeddedSignature: false,
    itiValidationRequired: false,
  }),
  'PENDENTE',
);

assert.equal(
  determineAsoCallbackStatus({
    professionalCode: '1698',
    signatureEnabled: true,
    signatureStatus: 'LIBERADO',
    hasEmbeddedSignature: true,
    itiValidationRequired: true,
    validationUrl: '',
  }),
  'PENDENTE',
);

console.log(
  'OK determineAsoCallbackStatus nao libera ASO sem assinatura digital valida',
);
