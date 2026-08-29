import { fuzzyTokenMatchInText } from './name-normalization.util';
import { getYearEvidenceDecision } from '../exam-matcher.service';

const NAME_STOPWORDS = new Set([
  'da',
  'de',
  'do',
  'dos',
  'das',
  'e',
  'di',
  'du',
  'del',
  'della',
]);

function normalizeString(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function extractDigits(value?: string): string {
  return (value || '').replace(/\D/g, '');
}

function parseDateParts(
  value?: string,
): { day: string; month: string; year: string } | null {
  if (!value) return null;
  const fullDate = value.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (!fullDate) return null;
  return {
    day: fullDate[1].padStart(2, '0'),
    month: fullDate[2].padStart(2, '0'),
    year: fullDate[3],
  };
}

function hasDateEvidence(reportText: string, value?: string): boolean {
  const parts = parseDateParts(value);
  if (!parts) return false;
  const variants = [
    `${parts.day}/${parts.month}/${parts.year}`,
    `${parts.day}-${parts.month}-${parts.year}`,
    `${Number(parts.day)}/${Number(parts.month)}/${parts.year}`,
    `${Number(parts.day)}-${Number(parts.month)}-${parts.year}`,
  ];
  return variants.some((date) => reportText.includes(date));
}

function getPatientNameTokens(name?: string): string[] {
  return normalizeString(name || '')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !NAME_STOPWORDS.has(token));
}

export function buildSearchAttemptSummary(
  variants: string[],
  attempts: Array<{ query: string; resultCount: number }>,
) {
  const successfulAttempt = attempts.find((attempt) => attempt.resultCount > 0);
  return {
    attemptedQueries: attempts.map((attempt) => attempt.query),
    totalVariants: variants.length,
    successfulQuery: successfulAttempt?.query ?? null,
    totalCandidatesFound: successfulAttempt?.resultCount ?? 0,
  };
}

export function buildRankedCandidateDiagnosticSummary<
  T extends {
    id?: string;
    patientName: string;
    date?: string;
    status?: string;
    score: number;
    diagnostic: {
      matchedTokens: number;
      totalReferenceTokens: number;
      hasExactName: boolean;
      hasSameAppointmentYear: boolean;
    };
  },
>(rankedCandidates: T[], limit = 5) {
  return rankedCandidates.slice(0, limit).map((candidate) => ({
    id: candidate.id ?? '',
    patientName: candidate.patientName,
    date: candidate.date ?? '',
    status: candidate.status ?? '',
    score: candidate.score,
    matchedTokens: candidate.diagnostic.matchedTokens,
    totalReferenceTokens: candidate.diagnostic.totalReferenceTokens,
    hasExactName: candidate.diagnostic.hasExactName,
    hasSameAppointmentYear: candidate.diagnostic.hasSameAppointmentYear,
  }));
}

export function buildIdentityDiagnosticSummary(params: {
  patientName: string;
  patientCpf: string;
  patientBirthDate: string;
  appointmentDate: string;
  reportText: string;
}) {
  const normalizedReport = normalizeString(params.reportText);
  const nameTokens = getPatientNameTokens(params.patientName);
  const reportTokens = normalizedReport.split(/\s+/);
  const matchedNameTokens = nameTokens.filter((token) =>
    fuzzyTokenMatchInText(token, reportTokens)
  ).length;
  const minimumNameTokens = Math.min(2, nameTokens.length);
  const cpfDigits = extractDigits(params.patientCpf);
  const reportDigits = extractDigits(params.reportText);
  const hasCpf =
    cpfDigits.length >= 11 && reportDigits.includes(cpfDigits);
  const hasBirthDate = hasDateEvidence(
    params.reportText,
    params.patientBirthDate,
  );
  const hasAppointmentDate = hasDateEvidence(
    params.reportText,
    params.appointmentDate,
  );
  const hasMinimumIdentity =
    (matchedNameTokens >= minimumNameTokens && (hasCpf || hasBirthDate)) ||
    (matchedNameTokens >= Math.min(3, nameTokens.length) && hasAppointmentDate);
  const yearDecision = getYearEvidenceDecision(
    params.reportText,
    params.appointmentDate,
  );

  return {
    matchedNameTokens,
    minimumNameTokens,
    hasCpf,
    hasBirthDate,
    hasAppointmentDate,
    hasMinimumIdentity,
    foundYears: yearDecision.foundYears,
    yearReason: yearDecision.reason,
    yearRejected: yearDecision.shouldReject,
  };
}
