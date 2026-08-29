export type AsoCallbackStatus = 'LIBERADO' | 'PENDENTE' | 'FALHA';

export function determineAsoCallbackStatus(params: {
  professionalCode: string;
  signatureEnabled: boolean;
  signatureStatus: AsoCallbackStatus;
  hasEmbeddedSignature?: boolean;
  itiValidationRequired?: boolean;
  validationUrl?: string;
  requiresSignature?: boolean;
}): AsoCallbackStatus {
  const professionalCode = String(params.professionalCode || '').trim();
  const validationUrl = String(params.validationUrl || '').trim();

  if (params.requiresSignature === false) {
    return 'LIBERADO';
  }

  if (!professionalCode) {
    return 'PENDENTE';
  }

  if (!params.signatureEnabled) {
    return 'PENDENTE';
  }

  if (!params.hasEmbeddedSignature) {
    return 'PENDENTE';
  }

  if (params.itiValidationRequired && !validationUrl) {
    return 'PENDENTE';
  }


  return params.signatureStatus;
}
