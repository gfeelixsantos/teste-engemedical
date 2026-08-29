import { ExamsScheduled } from 'src/mongo/types/scheduling';
import {
  compareExamMatchAcrossThresholds,
  evaluateExamMatchDecision,
} from './exam-match-threshold-analysis';

describe('exam-match-threshold-analysis', () => {
  const labExam: ExamsScheduled = {
    codigoExame: 'LAB-1',
    nomeExame: 'Hemograma Completo',
    grupo: 'Laboratorio',
    status: 'AGUARDANDO_RESULTADO',
  };

  const rxExam: ExamsScheduled = {
    codigoExame: 'RX-1',
    nomeExame: 'Raio-X de Torax OIT',
    grupo: 'Raio-X',
    status: 'AGUARDANDO_RESULTADO',
  };

  it('flags additional matches unlocked only by lower thresholds', () => {
    const reportText = `
      Paciente: Joao da Silva
      Resultado do hemograma completo com serie vermelha e leucocitos.
    `;

    const comparison = compareExamMatchAcrossThresholds({
      exam: labExam,
      reportText,
      aiMatch: {
        index: 0,
        confidence: 0.64,
        classification: 'RESULT',
      },
      thresholds: [0.6, 0.7],
    });

    expect(comparison.bestAcceptedThreshold).toBe(0.6);
    expect(comparison.outcomes).toEqual([
      expect.objectContaining({
        threshold: 0.6,
        accepted: true,
        reason: 'accepted',
      }),
      expect.objectContaining({
        threshold: 0.7,
        accepted: false,
        reason: 'confidence_below_threshold',
      }),
    ]);
  });

  it('keeps non-lab requested-only classifications rejected in every threshold', () => {
    const reportText = `
      Paciente: Joao da Silva
      Resultado do raio x de torax oit.
    `;

    const decision = evaluateExamMatchDecision({
      exam: rxExam,
      reportText,
      aiMatch: {
        index: 0,
        confidence: 0.99,
        classification: 'REQUESTED_ONLY',
      },
      threshold: 0.6,
    });

    expect(decision).toEqual(
      expect.objectContaining({
        accepted: false,
        reason: 'classification_rejected',
      }),
    );
  });

  it('keeps exams rejected when textual evidence is insufficient even with high confidence', () => {
    const reportText = `
      Paciente: Joao da Silva
      Resultado do exame sem mencionar o nome esperado.
    `;

    const comparison = compareExamMatchAcrossThresholds({
      exam: rxExam,
      reportText,
      aiMatch: {
        index: 0,
        confidence: 0.95,
        classification: 'RESULT',
      },
      thresholds: [0.6, 0.7],
    });

    expect(comparison.bestAcceptedThreshold).toBeNull();
    expect(comparison.outcomes.every((outcome) => outcome.reason === 'text_evidence_missing')).toBe(true);
  });
});
