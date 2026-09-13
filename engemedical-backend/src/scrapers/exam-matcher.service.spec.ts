import { ExamsScheduled } from 'src/mongo/types/scheduling';
import {
  ExamMatcherService,
  getYearEvidenceDecision,
  hasMinimumLabTextEvidence,
} from './exam-matcher.service';

describe('ExamMatcherService', () => {
  const patientInfo = {
    nome: 'Joao da Silva',
    cpf: '12345678901',
    dataAgendamento: '01/04/2026',
    dataNascimento: '02/02/1990',
  };

  beforeAll(() => {
    process.env.AZURE_OPENAI_API_KEY =
      process.env.AZURE_OPENAI_API_KEY || 'test-key';
    process.env.AZURE_OPENAI_ENDPOINT =
      process.env.AZURE_OPENAI_ENDPOINT ||
      'https://example-resource.openai.azure.com/openai/v1/';
    process.env.GROQ_API_KEY =
      process.env.GROQ_API_KEY || 'test-key';
  });

  function createServiceWithAiResponse(matches: unknown) {
    const service = new ExamMatcherService();
    (service as any).client = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({ matches, reasoning: 'test' }),
                },
              },
            ],
          }),
        },
      },
    };
    return service;
  }

  it('starts without AI credentials configured', () => {
    const previousAzureKey = process.env.AZURE_OPENAI_API_KEY;
    const previousGroqKey = process.env.GROQ_API_KEY;

    delete process.env.AZURE_OPENAI_API_KEY;
    delete process.env.GROQ_API_KEY;

    expect(() => new ExamMatcherService()).not.toThrow();

    if (previousAzureKey === undefined) {
      delete process.env.AZURE_OPENAI_API_KEY;
    } else {
      process.env.AZURE_OPENAI_API_KEY = previousAzureKey;
    }
    if (previousGroqKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = previousGroqKey;
    }
  });

  it('accepts lab report with variable nomenclature', async () => {
    const service = createServiceWithAiResponse([
      {
        index: 0,
        confidence: 0.72,
        classification: 'REQUESTED_ONLY',
      },
    ]);
    const pendingExams: ExamsScheduled[] = [
      {
        codigoExame: 'LAB-1',
        nomeExame: 'Hemograma Completo',
        grupo: 'Laboratorio',
        status: 'AGUARDANDO_RESULTADO',
      },
    ];
    const reportText = `
      Worklab
      Paciente: Joao da Silva
      CPF: 123.456.789-01
      Data de nascimento: 02/02/1990
      Data do exame: 01/04/2026
      Resultado do hemograma com serie vermelha e leucocitos.
    `;

    await expect(
      service.matchExams(reportText, pendingExams, patientInfo),
    ).resolves.toEqual([{ codigoExame: 'LAB-1', confidence: 0.72 }]);
  }, 10000);
 
  it('preserves current behavior for non-lab exams', async () => {
    const service = createServiceWithAiResponse([
      {
        index: 0,
        confidence: 0.72,
        classification: 'REQUESTED_ONLY',
      },
    ]);
    const pendingExams: ExamsScheduled[] = [
      {
        codigoExame: 'RX-1',
        nomeExame: 'Raio-X de Torax OIT',
        grupo: 'Raio-X',
        status: 'AGUARDANDO_RESULTADO',
      },
    ];
    const reportText = `
      Paciente: Joao da Silva
      CPF: 123.456.789-01
      Data de nascimento: 02/02/1990
      Data do exame: 01/04/2026
      Resultado do raio x de torax oit.
    `;
 
    await expect(
      service.matchExams(reportText, pendingExams, patientInfo),
    ).resolves.toEqual([]);
  });
 
  it('identifies Raio-X OIT exam using the OIT report text', async () => {
    const service = createServiceWithAiResponse([
      {
        index: 0,
        confidence: 0.98,
        classification: 'RESULT',
      },
    ]);
    const daianeInfo = {
      nome: 'DAIANE CAUZA ALEXANDRE FREITAS',
      cpf: '12760337456',
      dataAgendamento: '10/04/2026',
      dataNascimento: '19/10/2000',
    };
    const pendingExams: ExamsScheduled[] = [
      {
        codigoExame: '32050070',
        nomeExame: 'Radiografia de tórax (PA) Padrão OIT (o mais recente), com pelo menos um leitor habilitado (Cód. eSocial - 1415)',
        grupo: 'Raio-X',
        status: 'AGUARDANDO_RESULTADO',
      },
    ];
    // Snippet simplificado do laudo real (raiox.pdf)
    const reportText = `
      Folha de Leitura Radiologica – Classificação Internacional de Radiografias de Pneumoconiose – OIT 2011.
      Nome: DAIANE CAUZA ALEXANDRE FREITAS Idade: 25 Anos
      Leitor: Dr. Henrique Trigo bianchessi - CRM: 95422-SP
      Data: 10/04/2026
      1B-Radiografia normal: [X] Sim (finalizar a leitura)
      Emitido em: 10/04/2026 15:59:05
    `;
 
    await expect(
      service.matchExams(reportText, pendingExams, daianeInfo),
    ).resolves.toEqual([{ codigoExame: '32050070', confidence: 0.98 }]);
  });
 
  it('keeps dangerous partial collision blocked in lab reports', () => {
    const reportText = `
      Paciente: Joao da Silva
      Resultado: Hemoglobina 14,2 g/dL
    `;
 
    expect(hasMinimumLabTextEvidence(reportText, 'Hemoglobina Glicada')).toBe(
      false,
    );
  });
 
  it('allows multiple years without global YEAR rejection', async () => {
    const service = createServiceWithAiResponse([
      {
        index: 0,
        confidence: 0.95,
        classification: 'RESULT',
      },
    ]);
    const pendingExams: ExamsScheduled[] = [
      {
        codigoExame: 'RX-1',
        nomeExame: 'Radiografia de torax padrao OIT',
        grupo: 'Raio-X',
        status: 'AGUARDANDO_RESULTADO',
      },
    ];
    const reportText = `
      Paciente: Joao da Silva
      CPF: 123.456.789-01
      Data de nascimento: 02/02/1990
      Data anterior: 15/03/2025
      Exame historico: 14/09/2024
      Referencia futura: 10/10/2027
      Resultado do raio x de torax padrao oit.
    `;
 
    await expect(
      service.matchExams(reportText, pendingExams, patientInfo),
    ).resolves.toEqual([{ codigoExame: 'RX-1', confidence: 0.95 }]);
  });

  it('keeps YEAR rejection when only one wrong year is present', async () => {
    const service = createServiceWithAiResponse([
      {
        index: 0,
        confidence: 0.99,
        classification: 'RESULT',
      },
    ]);
    const pendingExams: ExamsScheduled[] = [
      {
        codigoExame: 'RX-1',
        nomeExame: 'Radiografia de torax padrao OIT',
        grupo: 'Raio-X',
        status: 'AGUARDANDO_RESULTADO',
      },
    ];
    const reportText = `
      Paciente: Joao da Silva
      CPF: 123.456.789-01
      Data de nascimento: 02/02/1990
      Data do exame: 15/03/2025
      Resultado do raio x de torax padrao oit.
    `;

    await expect(
      service.matchExams(reportText, pendingExams, patientInfo),
    ).resolves.toEqual([]);
  });

  it('ignores eSocial code noise in lab text evidence', () => {
    const reportText = `
      Paciente: Joao da Silva
      Colesterol HDL: 48 mg/dL
    `;

    expect(
      hasMinimumLabTextEvidence(
        reportText,
        'Colesterol (HDL) (Cod. eSocial - 0423)',
      ),
    ).toBe(true);
  });

  it('accepts glicemia when report uses glicose', () => {
    const reportText = `
      Paciente: Joao da Silva
      Glicose: 92 mg/dL
    `;

    expect(
      hasMinimumLabTextEvidence(reportText, 'Glicemia (Cod. eSocial - 0658)'),
    ).toBe(true);
  });

  it('keeps dangerous HDL vs LDL collision blocked', () => {
    const reportText = `
      Paciente: Joao da Silva
      Colesterol HDL: 48 mg/dL
    `;

    expect(
      hasMinimumLabTextEvidence(
        reportText,
        'Colesterol (LDL) (Cod. eSocial - 0424)',
      ),
    ).toBe(false);
  });

  it('reports YEAR decision: rejects multiple years all before expected', () => {
    expect(
      getYearEvidenceDecision(
        'Data anterior 15/03/2025 e outra referencia 14/09/2024',
        patientInfo.dataAgendamento,
      ),
    ).toEqual(
      expect.objectContaining({
        shouldReject: true,
        reason: 'missing_expected_year',
        foundYears: [2024, 2025],
        expectedYear: 2026,
      }),
    );
  });

  it('reports YEAR decision: keeps multiple years when max >= expected', () => {
    expect(
      getYearEvidenceDecision(
        'Referencias 14/09/2024 e 15/03/2028 sem o ano esperado',
        patientInfo.dataAgendamento,
      ),
    ).toEqual(
      expect.objectContaining({
        shouldReject: false,
        reason: 'multiple_years_without_expected',
        foundYears: [2024, 2028],
        expectedYear: 2026,
      }),
    );
  });

  it('reports YEAR decision: rejects [2011, 2025] when expected 2026', () => {
    expect(
      getYearEvidenceDecision(
        'Laudo de referencia: 10/05/2011 e atualizacao 22/08/2025',
        patientInfo.dataAgendamento,
      ),
    ).toEqual(
      expect.objectContaining({
        shouldReject: true,
        reason: 'missing_expected_year',
        foundYears: [2011, 2025],
        expectedYear: 2026,
      }),
    );
  });

  it('rejects Veitieka OIT from prior year (Leonardo Chavoni Zachetti case)', () => {
    // Caso real do report: agendamento em 18/08/2026, PDF tem anos [2011, 2025]
    const leonardoInfo = {
      ...patientInfo,
      dataAgendamento: '18/08/2026',
    };
    expect(
      getYearEvidenceDecision(
        'Paciente: Leonardo Chavoni Zachetti Laudo de referencia: 10/05/2011 e atualizacao 22/08/2025',
        leonardoInfo.dataAgendamento,
      ),
    ).toEqual(
      expect.objectContaining({
        shouldReject: true,
        reason: 'missing_expected_year',
        foundYears: [2011, 2025],
        expectedYear: 2026,
      }),
    );
  });
});
