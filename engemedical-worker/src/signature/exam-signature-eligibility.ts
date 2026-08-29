export function determineExamSignatureEligibility(params: {
  emitToAzure: boolean;
  requiresDigitalSignature: boolean;
  signatureEnabled: boolean;
  hasRuntimeSigningCapability: boolean;
}) {
  const shouldSign =
    params.emitToAzure &&
    params.requiresDigitalSignature &&
    (params.signatureEnabled || params.hasRuntimeSigningCapability);

  return {
    shouldSign,
  };
}
