import { ThresholdComparisonOutcome } from './exam-match-threshold-analysis';
import {
  buildDiagnosticReasonSummary,
  determineExamDiagnosticReason,
} from './scraper-diagnostic-report';

function outcome(
  reason: ThresholdComparisonOutcome['reason'],
  accepted = false,
): ThresholdComparisonOutcome {
  return {
    accepted,
    threshold: 0.7,
    reason,
    confidence: accepted ? 0.91 : 0.42,
    classification: accepted ? 'RESULT' : 'UNKNOWN',
  };
}

describe('scraper-diagnostic-report', () => {
  it('classifies attendances without portal candidates separately from AI failures', () => {
    expect(
      determineExamDiagnosticReason({
        currentThreshold: 0.7,
        bestAcceptedThreshold: null,
        currentOutcome: outcome('no_ai_match'),
        thresholdsBelowCurrentAccepted: [],
        providerAttempts: [
          {
            provider: 'Medical',
            candidatesFound: 0,
            pdfsDownloaded: 0,
            pdfsAnalyzed: 0,
            errors: [],
          },
        ],
        pdfSignals: [],
      }),
    ).toBe('no_portal_candidate');
  });

  it('prioritizes threshold-only unlocks when lower confidence would accept the exam', () => {
    expect(
      determineExamDiagnosticReason({
        currentThreshold: 0.7,
        bestAcceptedThreshold: 0.6,
        currentOutcome: outcome('confidence_below_threshold'),
        thresholdsBelowCurrentAccepted: [0.6, 0.65],
        providerAttempts: [
          {
            provider: 'Worklab',
            candidatesFound: 1,
            pdfsDownloaded: 1,
            pdfsAnalyzed: 1,
            errors: [],
          },
        ],
        pdfSignals: [
          {
            provider: 'Worklab',
            reportTextLength: 850,
            aiMatchFound: true,
            outcomeAtCurrentThreshold: outcome('confidence_below_threshold'),
          },
        ],
      }),
    ).toBe('accepted_only_below_threshold');
  });

  it('maps gate failures and text extraction issues to actionable categories', () => {
    expect(
      determineExamDiagnosticReason({
        currentThreshold: 0.7,
        bestAcceptedThreshold: null,
        thresholdsBelowCurrentAccepted: [],
        providerAttempts: [
          {
            provider: 'Medical',
            candidatesFound: 2,
            pdfsDownloaded: 1,
            pdfsAnalyzed: 1,
            errors: [],
          },
        ],
        pdfSignals: [
          {
            provider: 'Medical',
            reportTextLength: 0,
            gateReason: 'pdf_text_empty_or_poor',
            aiMatchFound: false,
          },
        ],
      }),
    ).toBe('pdf_text_empty_or_poor');

    expect(
      determineExamDiagnosticReason({
        currentThreshold: 0.7,
        bestAcceptedThreshold: null,
        thresholdsBelowCurrentAccepted: [],
        providerAttempts: [
          {
            provider: 'Medical',
            candidatesFound: 2,
            pdfsDownloaded: 1,
            pdfsAnalyzed: 1,
            errors: [],
          },
        ],
        pdfSignals: [
          {
            provider: 'Medical',
            reportTextLength: 450,
            gateReason: 'identity:minimum_evidence_missing',
            aiMatchFound: false,
          },
        ],
      }),
    ).toBe('rejected_identity');
  });

  it('summarizes reasons for aggregation', () => {
    expect(
      buildDiagnosticReasonSummary([
        'no_portal_candidate',
        'no_portal_candidate',
        'rejected_text_evidence',
      ]),
    ).toEqual({
      no_portal_candidate: 2,
      rejected_text_evidence: 1,
    });
  });
});
