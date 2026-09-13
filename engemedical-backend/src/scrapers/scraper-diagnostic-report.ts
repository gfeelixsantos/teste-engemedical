import { ThresholdComparisonOutcome } from './exam-match-threshold-analysis';

export type DiagnosticProviderName =
  | 'Worklab'
  | 'Medical';

export type ExamDiagnosticReason =
  | 'accepted_at_current_threshold'
  | 'accepted_only_below_threshold'
  | 'no_portal_candidate'
  | 'portal_candidate_no_pdf'
  | 'pdf_text_empty_or_poor'
  | 'rejected_identity'
  | 'rejected_year'
  | 'no_ai_match'
  | 'rejected_confidence'
  | 'rejected_classification'
  | 'rejected_text_evidence'
  | 'provider_error'
  | 'not_analyzed';

export type ExamDiagnosticPdfSignal = {
  provider: DiagnosticProviderName;
  reportTextLength: number;
  gateReason?: string;
  aiMatchFound?: boolean;
  outcomeAtCurrentThreshold?: ThresholdComparisonOutcome;
};

export type ExamDiagnosticProviderAttempt = {
  provider: DiagnosticProviderName;
  candidatesFound: number;
  pdfsDownloaded: number;
  pdfsAnalyzed: number;
  errors: string[];
};

export type ExamDiagnosticSummary = {
  currentThreshold: number;
  bestAcceptedThreshold: number | null;
  currentOutcome?: ThresholdComparisonOutcome;
  thresholdsBelowCurrentAccepted: number[];
  providerAttempts: ExamDiagnosticProviderAttempt[];
  pdfSignals: ExamDiagnosticPdfSignal[];
};

export function determineExamDiagnosticReason(
  summary: ExamDiagnosticSummary,
): ExamDiagnosticReason {
  const { currentOutcome, bestAcceptedThreshold, currentThreshold } = summary;

  if (currentOutcome?.accepted) {
    return 'accepted_at_current_threshold';
  }

  if (
    bestAcceptedThreshold !== null &&
    bestAcceptedThreshold < currentThreshold
  ) {
    return 'accepted_only_below_threshold';
  }

  const hasProviderError = summary.providerAttempts.some(
    (attempt) => attempt.errors.length > 0,
  );
  if (hasProviderError) {
    return 'provider_error';
  }

  const totalCandidates = summary.providerAttempts.reduce(
    (sum, attempt) => sum + attempt.candidatesFound,
    0,
  );
  if (totalCandidates === 0) {
    return 'no_portal_candidate';
  }

  const totalDownloadedPdfs = summary.providerAttempts.reduce(
    (sum, attempt) => sum + attempt.pdfsDownloaded,
    0,
  );
  if (totalDownloadedPdfs === 0) {
    return 'portal_candidate_no_pdf';
  }

  const totalAnalyzedPdfs = summary.providerAttempts.reduce(
    (sum, attempt) => sum + attempt.pdfsAnalyzed,
    0,
  );
  if (totalAnalyzedPdfs === 0) {
    return 'pdf_text_empty_or_poor';
  }

  const pdfSignals = summary.pdfSignals;

  if (
    pdfSignals.some(
      (signal) =>
        signal.reportTextLength === 0 ||
        signal.gateReason === 'pdf_text_empty_or_poor',
    )
  ) {
    return 'pdf_text_empty_or_poor';
  }

  if (pdfSignals.some((signal) => signal.gateReason?.startsWith('identity:'))) {
    return 'rejected_identity';
  }

  if (pdfSignals.some((signal) => signal.gateReason?.startsWith('year:'))) {
    return 'rejected_year';
  }

  if (currentOutcome?.reason === 'text_evidence_missing') {
    return 'rejected_text_evidence';
  }

  if (currentOutcome?.reason === 'classification_rejected') {
    return 'rejected_classification';
  }

  if (currentOutcome?.reason === 'confidence_below_threshold') {
    return 'rejected_confidence';
  }

  if (
    pdfSignals.length > 0 &&
    pdfSignals.some((signal) => signal.aiMatchFound === false)
  ) {
    return 'no_ai_match';
  }

  if (currentOutcome?.reason === 'no_ai_match') {
    return 'no_ai_match';
  }

  return 'not_analyzed';
}

export function buildDiagnosticReasonSummary(
  reasons: ExamDiagnosticReason[],
): Record<ExamDiagnosticReason, number> {
  const summary = {} as Record<ExamDiagnosticReason, number>;
  for (const reason of reasons) {
    summary[reason] = (summary[reason] || 0) + 1;
  }
  return summary;
}
