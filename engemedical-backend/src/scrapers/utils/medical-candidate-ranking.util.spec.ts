import {
  rankDateAwareCandidates,
  rankMedicalCandidates,
  summarizeRankedMedicalCandidates,
} from './medical-candidate-ranking.util';

describe('medical-candidate-ranking.util', () => {
  it('prioriza o candidato com nome exato e data mais aderente', () => {
    const ranked = rankMedicalCandidates(
      'JOSE CLAUDIO SANTOS DE OLIVEIRA',
      '11/05/2026',
      [
        {
          id: 'older-exact',
          patientName: 'JOSE CLAUDIO SANTOS DE OLIVEIRA',
          date: '15/04/2025',
          status: 'Liberado',
        },
        {
          id: 'best',
          patientName: 'JOSE CLAUDIO SANTOS DE OLIVEIRA',
          date: '10/05/2026',
          status: 'Liberado',
        },
        {
          id: 'partial',
          patientName: 'JOSE OLIVEIRA',
          date: '11/05/2026',
          status: 'Liberado',
        },
      ],
    );

    expect(ranked.map((candidate) => candidate.id)).toEqual([
      'best',
      'older-exact',
      'partial',
    ]);
    expect(ranked[0].diagnostic.hasExactName).toBe(true);
    expect(ranked[0].diagnostic.hasSameAppointmentYear).toBe(true);
  });

  it('resume o top de candidatos para diagnostico', () => {
    const ranked = rankMedicalCandidates('ANA SILVA', '08/05/2026', [
      {
        id: '1',
        patientName: 'ANA SILVA',
        date: '08/05/2026',
        status: 'Liberado',
      },
      {
        id: '2',
        patientName: 'ANA PAULA SILVA',
        date: '10/03/2025',
        status: 'Pendente',
      },
    ]);

    expect(summarizeRankedMedicalCandidates(ranked, 1)).toEqual([
      {
        id: '1',
        patientName: 'ANA SILVA',
        date: '08/05/2026',
        status: 'Liberado',
        score: ranked[0].score,
        matchedTokens: 2,
        totalReferenceTokens: 2,
        hasExactName: true,
        hasSameAppointmentYear: true,
      },
    ]);
  });

  it('prioriza a data mais proxima quando os nomes sao equivalentes', () => {
    const ranked = rankDateAwareCandidates('VICTOR DE SOUZA PEDROSO', '13/05/2026', [
      {
        id: 'older',
        patientName: 'VICTOR DE SOUZA PEDROSO',
        date: '10/04/2026',
        status: 'Liberado',
      },
      {
        id: 'closer',
        patientName: 'VICTOR DE SOUZA PEDROSO',
        date: '12/05/2026',
        status: 'Liberado',
      },
    ]);

    expect(ranked.map((candidate) => candidate.id)).toEqual([
      'closer',
      'older',
    ]);
  });

  /**
   * DOCUMENTAÇÃO DE COMPORTAMENTO ATUAL — rankDateAwareCandidates
   *
   * Este teste documenta o comportamento atual do `rankDateAwareCandidates`:
   * Candidatos com matchedTokens=0 (nome de exame) podem ser promovidos acima de
   * candidatos com matchedTokens>0 (nome parcial do paciente) apenas por proximidade de data.
   *
   * Score calculation (comportamento atual):
   *   CandidatoA (matchedTokens=0, date=14/03/2024, appointment=15/03/2024):
   *     0 (tokens) + 35 (same year) + 20 (same month) + 11 (1 day distance) = ~66
   *   CandidatoB (matchedTokens=2, date=20/03/2023, appointment=15/03/2024):
   *     40 (2 tokens × 20) + 0 (different year) + 0 (different month) + 0 (>12 days) = ~40
   *
   * COMPORTAMENTO ATUAL: candidatoA (matchedTokens=0, data próxima) aparece antes de
   * candidatoB (matchedTokens=2, data de ano diferente) devido ao score mais alto por data.
   *
   * NOTA: Este comportamento pode não ser ideal e pode ser corrigido no futuro.
   * O teste serve como documentação do comportamento atual para evitar regressões
   * não intencionais.
   */
  it('documenta comportamento atual: candidato com matchedTokens=0 pode ser promovido por proximidade de data', () => {
    // Candidato A: nome de exame (sem aderência ao nome do paciente), data próxima ao agendamento
    // Score esperado: 0 (tokens) + 35 (same year 2024) + 20 (same month 03) + 11 (1 day distance) ≈ 66
    const candidatoA = {
      id: 'exame-rx-torax',
      patientName: 'RX - Tórax OIT - 2 Assinaturas',
      date: '14/03/2024',
      status: '',
    };

    // Candidato B: nome parcial do paciente (matchedTokens=2), data de ano diferente (sem bônus de ano/mês)
    // Score esperado: 40 (2 tokens × 20) + 0 (different year 2023) + 0 (different month) + 0 (>12 days) ≈ 40
    const candidatoB = {
      id: 'joao-da-silva',
      patientName: 'João da Silva',
      date: '20/03/2023',
      status: '',
    };

    // Appointment date: 15/03/2024
    // CandidatoA: 1 dia de distância, mesmo ano e mês → score alto por data (~66)
    // CandidatoB: ano diferente (2023 vs 2024) → sem bônus de ano/mês, score apenas por tokens (~40)
    const ranked = rankDateAwareCandidates('João Silva', '15/03/2024', [
      candidatoA,
      candidatoB,
    ]);

    const rankedIds = ranked.map((c) => c.id);

    // Verificar que candidatoA tem matchedTokens=0 (confirma que é um nome de exame sem aderência)
    const rankedCandidatoA = ranked.find((c) => c.id === 'exame-rx-torax')!;
    expect(rankedCandidatoA.diagnostic.matchedTokens).toBe(0);

    // Verificar que candidatoB tem matchedTokens>0 (confirma aderência de nome)
    const rankedCandidatoB = ranked.find((c) => c.id === 'joao-da-silva')!;
    expect(rankedCandidatoB.diagnostic.matchedTokens).toBeGreaterThan(0);

    // ASSERTION: Documenta o comportamento atual
    // candidatoA (matchedTokens=0, score ~66) aparece antes de candidatoB (matchedTokens=2, score ~40)
    // devido ao bônus de proximidade de data
    expect(rankedIds.indexOf('exame-rx-torax')).toBeLessThan(
      rankedIds.indexOf('joao-da-silva'),
    );
  });
});
