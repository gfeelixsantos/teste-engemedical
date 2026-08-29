import {
  buildRankedCandidateDiagnosticSummary,
  buildIdentityDiagnosticSummary,
  buildSearchAttemptSummary,
} from './scraper-diagnostics.util';

describe('scraper-diagnostics.util', () => {
  it('summarizes search attempts with counts and successful variant', () => {
    expect(
      buildSearchAttemptSummary(
        ['MARCO ANTONIO', 'marco antonio', 'marco contessoto'],
        [
          { query: 'MARCO ANTONIO', resultCount: 0 },
          { query: 'marco antonio', resultCount: 2 },
        ],
      ),
    ).toEqual({
      attemptedQueries: ['MARCO ANTONIO', 'marco antonio'],
      totalVariants: 3,
      successfulQuery: 'marco antonio',
      totalCandidatesFound: 2,
    });
  });

  it('reports identity evidence and year evidence in a compact payload', () => {
    expect(
      buildIdentityDiagnosticSummary({
        patientName: 'Joao da Silva',
        patientCpf: '123.456.789-01',
        patientBirthDate: '02/02/1990',
        appointmentDate: '01/04/2026',
        reportText: `
          Paciente: Joao da Silva
          CPF: 12345678901
          Data de nascimento: 02/02/1990
          Data do exame: 15/03/2025
        `,
      }),
    ).toEqual({
      matchedNameTokens: 2,
      minimumNameTokens: 2,
      hasCpf: true,
      hasBirthDate: true,
      hasAppointmentDate: false,
      hasMinimumIdentity: true,
      foundYears: [2025],
      yearReason: 'missing_expected_year',
      yearRejected: true,
    });
  });

  it('summarizes ranked candidates for targeted diagnostics', () => {
    expect(
      buildRankedCandidateDiagnosticSummary([
        {
          id: 'best',
          patientName: 'JOSE DA SILVA',
          date: '12/05/2026',
          status: 'Liberado',
          score: 120,
          diagnostic: {
            matchedTokens: 3,
            totalReferenceTokens: 3,
            hasExactName: true,
            hasSameAppointmentYear: true,
          },
        },
      ]),
    ).toEqual([
      {
        id: 'best',
        patientName: 'JOSE DA SILVA',
        date: '12/05/2026',
        status: 'Liberado',
        score: 120,
        matchedTokens: 3,
        totalReferenceTokens: 3,
        hasExactName: true,
        hasSameAppointmentYear: true,
      },
    ]);
  });
});
