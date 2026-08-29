import type { DocumentSignatureInfo } from '../types/scheduling';
import { mapStatusToPtBr } from 'src/worker/status.helper';

export function mapLegacyExamSignatureStatus(
  status?: string,
): DocumentSignatureInfo['status'] {
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
      return mapStatusToPtBr(String(status || ''));
  }
}

export function normalizeLegacyExamSignature(
  legacySignatureInfo: any,
  url?: string,
): DocumentSignatureInfo | undefined {
  if (!legacySignatureInfo || typeof legacySignatureInfo !== 'object') {
    return undefined;
  }

  const status = mapLegacyExamSignatureStatus(legacySignatureInfo.status);
  const provider =
    legacySignatureInfo?.kmsType === 'BRYKMS' ||
    legacySignatureInfo?.provider === 'BRYKMS'
      ? 'BRYKMS'
      : legacySignatureInfo?.kmsType === 'PSC' || legacySignatureInfo?.provider
        ? 'PSC'
        : status === 'DIGITALIZADA'
          ? 'DIGITALIZADA'
          : undefined;

  return {
    documentType: 'EXAME',
    requiresSignature: status !== 'DIGITALIZADA',
    status,
    provider,
    signedAt: legacySignatureInfo?.signedAt,
    signedUrl: status === 'ASSINADO' ? url : undefined,
    retry: {
      pending:
        status === 'PENDENTE' &&
        Boolean(
          legacySignatureInfo?.nextRetryAt ||
            legacySignatureInfo?.retryCount > 0,
        ),
      count: Number(legacySignatureInfo?.retryCount || 0),
      ...(legacySignatureInfo?.nextRetryAt
        ? { nextRetryAt: legacySignatureInfo.nextRetryAt }
        : {}),
    },
    error:
      status === 'FALHA'
        ? legacySignatureInfo?.lastError ||
          'Falha no processamento do documento'
        : undefined,
  };
}
