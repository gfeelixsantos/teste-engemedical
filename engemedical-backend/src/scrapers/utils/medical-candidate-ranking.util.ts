// Dead code — não utilizado após remoção de rankDateAwareCandidates em scraper.service.ts
// (ver bugfix restaurar-ordem-scraper-sem-ranking-data)
// Este arquivo pode ser removido em limpeza futura. NÃO deve ser usado no fluxo principal
// sem validação forte de identidade (matchedTokens > 0).
import {
  normalizePersonName,
  splitNameTokens,
} from './name-normalization.util';

type MedicalCandidateInput = {
  id?: string;
  patientName: string;
  date?: string;
  status?: string;
  originalCandidate?: unknown;
};

export type RankedDateAwareCandidate = MedicalCandidateInput & {
  score: number;
  diagnostic: {
    matchedTokens: number;
    totalReferenceTokens: number;
    hasExactName: boolean;
    hasSameAppointmentYear: boolean;
    hasSameAppointmentMonth: boolean;
    hasResultStatus: boolean;
  };
};

function parseDateParts(
  value?: string,
): { day: number; month: number; year: number } | null {
  if (!value) return null;
  const match = value.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (!match) return null;

  return {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  };
}

function buildCandidateScore(
  referenceName: string,
  appointmentDate: string,
  candidate: MedicalCandidateInput,
): RankedDateAwareCandidate {
  const referenceNameNormalized = normalizePersonName(referenceName);
  const referenceTokens = splitNameTokens(referenceName);
  const candidateNameNormalized = normalizePersonName(candidate.patientName);
  const matchedTokens = referenceTokens.filter((token) =>
    candidateNameNormalized.includes(token),
  ).length;
  const hasExactName = candidateNameNormalized === referenceNameNormalized;

  const appointment = parseDateParts(appointmentDate);
  const candidateDate = parseDateParts(candidate.date);
  const hasSameAppointmentYear =
    !!appointment && !!candidateDate && appointment.year === candidateDate.year;
  const hasSameAppointmentMonth =
    hasSameAppointmentYear && appointment!.month === candidateDate!.month;
  const appointmentDayDistance =
    appointment && candidateDate
      ? Math.abs(
          Date.UTC(appointment.year, appointment.month - 1, appointment.day) -
            Date.UTC(
              candidateDate.year,
              candidateDate.month - 1,
              candidateDate.day,
            ),
        ) /
        (1000 * 60 * 60 * 24)
      : null;
  const hasResultStatus = /(liberad|conclu|finaliz|resultado)/i.test(
    candidate.status || '',
  );

  let score = 0;
  score += matchedTokens * 20;
  score += hasExactName ? 80 : 0;
  score += hasSameAppointmentYear ? 35 : 0;
  score += hasSameAppointmentMonth ? 20 : 0;
  if (appointmentDayDistance !== null) {
    score += Math.max(0, 12 - Math.min(appointmentDayDistance, 12));
  }
  score += hasResultStatus ? 5 : 0;

  if (candidateDate) {
    score += candidateDate.year / 10000;
    score += candidateDate.month / 1000000;
    score += candidateDate.day / 100000000;
  }

  return {
    ...candidate,
    score,
    diagnostic: {
      matchedTokens,
      totalReferenceTokens: referenceTokens.length,
      hasExactName,
      hasSameAppointmentYear,
      hasSameAppointmentMonth,
      hasResultStatus,
    },
  };
}

export function rankDateAwareCandidates(
  referenceName: string,
  appointmentDate: string,
  candidates: MedicalCandidateInput[],
): RankedDateAwareCandidate[] {
  return [...candidates]
    .map((candidate) =>
      buildCandidateScore(referenceName, appointmentDate, candidate),
    )
    .sort((left, right) => right.score - left.score);
}

export function rankMedicalCandidates(
  referenceName: string,
  appointmentDate: string,
  candidates: MedicalCandidateInput[],
) {
  return rankDateAwareCandidates(referenceName, appointmentDate, candidates);
}

export function summarizeRankedMedicalCandidates(
  candidates: RankedDateAwareCandidate[],
  limit = 5,
) {
  return candidates.slice(0, limit).map((candidate) => ({
    id: candidate.id,
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
