import { strict as assert } from 'node:assert';

import { determineExamSignatureEligibility } from './exam-signature-eligibility';

assert.equal(
  determineExamSignatureEligibility({
    emitToAzure: true,
    requiresDigitalSignature: true,
    signatureEnabled: true,
    hasRuntimeSigningCapability: false,
  }).shouldSign,
  true,
);

assert.equal(
  determineExamSignatureEligibility({
    emitToAzure: true,
    requiresDigitalSignature: true,
    signatureEnabled: false,
    hasRuntimeSigningCapability: true,
  }).shouldSign,
  true,
);

assert.equal(
  determineExamSignatureEligibility({
    emitToAzure: true,
    requiresDigitalSignature: true,
    signatureEnabled: false,
    hasRuntimeSigningCapability: false,
  }).shouldSign,
  false,
);

assert.equal(
  determineExamSignatureEligibility({
    emitToAzure: true,
    requiresDigitalSignature: false,
    signatureEnabled: true,
    hasRuntimeSigningCapability: true,
  }).shouldSign,
  false,
);

console.log(
  'OK determineExamSignatureEligibility preserva assinatura de exame quando ha capacidade real de runtime',
);
