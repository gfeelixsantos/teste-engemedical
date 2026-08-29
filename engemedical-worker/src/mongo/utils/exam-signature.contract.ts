import type { SignatureInfo } from '../types/scheduling';

export function mapLegacySignatureStatus(status?: string) {
  switch (String(status || '').trim()) {
    case 'ASSINADO':
    case 'SIGNED':
      return 'ASSINADO';
    case 'PROCESSANDO_ASSINATURA':
    case 'PROCESSING':
      return 'PROCESSANDO';
    case 'FALHA_ASSINATURA':
    case 'FAILED':
      return 'FALHA';
    case 'NAO_REQUER_ASSINATURA':
    case 'NOT_REQUIRED':
      return 'DIGITALIZADA';
    case 'AGUARDANDO_AUTENTICACAO':
    case 'WAITING_AUTH':
    case 'AGUARDANDO_REPROCESSAMENTO':
    case 'PENDING_RETRY':
      return 'PENDENTE';
    default:
      return 'DIGITALIZADA';
  }
}

export function buildUnifiedExamSignature(
  signatureInfo?: SignatureInfo | Record<string, any>,
  url?: string,
) {
  if (!signatureInfo || typeof signatureInfo !== 'object') {
    return undefined;
  }

  const normalizedStatus = mapLegacySignatureStatus(signatureInfo.status);
  const provider =
    signatureInfo?.kmsType === 'BRYKMS' || signatureInfo?.provider === 'BRYKMS'
      ? 'BRYKMS'
      : signatureInfo?.kmsType === 'PSC' || signatureInfo?.provider
        ? 'PSC'
        : normalizedStatus === 'DIGITALIZADA'
          ? 'DIGITALIZADA'
          : undefined;

  return {
    documentType: 'EXAME',
    requiresSignature: normalizedStatus !== 'DIGITALIZADA',
    status: normalizedStatus,
    provider,
    signedAt: signatureInfo?.signedAt,
    signedUrl: normalizedStatus === 'ASSINADO' ? url : undefined,
    retry: {
      pending:
        normalizedStatus === 'PENDENTE' &&
        Boolean(signatureInfo?.nextRetryAt || signatureInfo?.retryCount > 0),
      count: Number(signatureInfo?.retryCount || 0),
      ...(signatureInfo?.nextRetryAt
        ? { nextRetryAt: signatureInfo.nextRetryAt }
        : {}),
    },
    error:
      normalizedStatus === 'FALHA'
        ? signatureInfo?.lastError || 'Falha no processamento do documento'
        : undefined,
  };
}
