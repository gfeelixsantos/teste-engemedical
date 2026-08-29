import { ExamsScheduled } from 'src/mongo/types/scheduling';
import {
  AiMatchItem,
  getMinimumConfidence,
  getTextEvidenceEvaluator,
  hasAcceptedClassification,
} from './exam-matcher.service';

export type ExamMatchDecisionReason =
  | 'accepted'
  | 'no_ai_match'
  | 'confidence_below_threshold'
  | 'classification_rejected'
  | 'text_evidence_missing';

export type ExamMatchDecision = {
  accepted: boolean;
  threshold: number;
  reason: ExamMatchDecisionReason;
  confidence: number;
  classification?: AiMatchItem['classification'];
  evidence?: string;
};

export type ThresholdComparisonOutcome = ExamMatchDecision & {
  threshold: number;
};

export function evaluateExamMatchDecision(params: {
  exam: ExamsScheduled;
  reportText: string;
  aiMatch?: AiMatchItem | null;
  threshold?: number;
}): ExamMatchDecision {
  const { exam, reportText, aiMatch, threshold = getMinimumConfidence(exam) } =
    params;

  if (!aiMatch) {
    return {
      accepted: false,
      threshold,
      reason: 'no_ai_match',
      confidence: 0,
    };
  }

  const confidence = aiMatch.confidence ?? 0;
  if (confidence < threshold) {
    return {
      accepted: false,
      threshold,
      reason: 'confidence_below_threshold',
      confidence,
      classification: aiMatch.classification,
      evidence: aiMatch.evidence,
    };
  }

  if (!hasAcceptedClassification(exam, aiMatch.classification)) {
    return {
      accepted: false,
      threshold,
      reason: 'classification_rejected',
      confidence,
      classification: aiMatch.classification,
      evidence: aiMatch.evidence,
    };
  }

  const hasTextEvidence = getTextEvidenceEvaluator(exam)(
    reportText,
    exam.nomeExame,
  );
  if (!hasTextEvidence) {
    return {
      accepted: false,
      threshold,
      reason: 'text_evidence_missing',
      confidence,
      classification: aiMatch.classification,
      evidence: aiMatch.evidence,
    };
  }

  return {
    accepted: true,
    threshold,
    reason: 'accepted',
    confidence,
    classification: aiMatch.classification,
    evidence: aiMatch.evidence,
  };
}

export function compareExamMatchAcrossThresholds(params: {
  exam: ExamsScheduled;
  reportText: string;
  aiMatch?: AiMatchItem | null;
  thresholds: number[];
}) {
  const thresholds = [...new Set(params.thresholds)].sort((a, b) => a - b);
  const outcomes: ThresholdComparisonOutcome[] = thresholds.map((threshold) =>
    evaluateExamMatchDecision({
      exam: params.exam,
      reportText: params.reportText,
      aiMatch: params.aiMatch,
      threshold,
    }),
  );

  const acceptedOutcome = outcomes.find((outcome) => outcome.accepted) ?? null;

  return {
    outcomes,
    bestAcceptedThreshold: acceptedOutcome?.threshold ?? null,
  };
}
