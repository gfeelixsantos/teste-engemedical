import { ExamStatus } from '../enum/scheduling.enum';
import type {
  DocumentSignatureInfo,
  ExamsScheduled,
} from '../types/scheduling';

const FINAL_SIGNATURE_STATUSES = new Set<
  NonNullable<DocumentSignatureInfo['status']>
>(['ASSINADO', 'DIGITALIZADA', 'LIBERADO']);
const PENDING_BUT_USABLE_SIGNATURE_STATUSES = new Set<
  NonNullable<DocumentSignatureInfo['status']>
>(['PENDENTE', 'PROCESSANDO']);

function hasNonEmptyUrl(url?: string) {
  return typeof url === 'string' && url.trim() !== '';
}

export function isFinalSignatureStatus(status?: string) {
  return FINAL_SIGNATURE_STATUSES.has(
    String(status || '').trim() as DocumentSignatureInfo['status'],
  );
}

export function isExamReadyForDownstream(exam?: Partial<ExamsScheduled>) {
  if (!exam) return false;

  if (
    exam.status !== ExamStatus.FINALIZADO &&
    exam.status !== ExamStatus.AGUARDANDO_RESULTADO
  ) {
    return false;
  }

  if (!hasNonEmptyUrl(exam.url)) {
    return false;
  }

  if (!exam.signature) {
    return true;
  }

  if (exam.signature.requiresSignature) {
    return (
      isFinalSignatureStatus(exam.signature.status) ||
      PENDING_BUT_USABLE_SIGNATURE_STATUSES.has(
        String(
          exam.signature.status || '',
        ).trim() as DocumentSignatureInfo['status'],
      )
    );
  }

  if (!exam.signature.status) {
    return true;
  }

  return isFinalSignatureStatus(exam.signature.status);
}

export function getExamDownstreamStateLabel(exam?: Partial<ExamsScheduled>) {
  const group = exam?.grupo || exam?.nomeExame || 'Exame';
  const status = exam?.status || 'SEM_STATUS';
  const signatureStatus = exam?.signature?.status || 'SEM_ASSINATURA';
  const urlState = hasNonEmptyUrl(exam?.url) ? 'com URL' : 'sem URL';

  return `${group}:${status}:${signatureStatus}:${urlState}`;
}
