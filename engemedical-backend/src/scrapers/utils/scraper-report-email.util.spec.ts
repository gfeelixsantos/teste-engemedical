import type { ScrapeReport } from '../scraper.service';
import { buildScraperReportEmailView } from './scraper-report-email.util';

describe('scraper-report-email.util', () => {
  const makeDetail = (
    patient: string,
    company: string,
    provider: string,
    status: 'SUCCESS' | 'NO_MATCH' | 'FAILED',
    matchedCount = 1,
  ): ScrapeReport['details'][number] => ({
    patient,
    company,
    cpf: '12345678901',
    provider,
    examType: 'ADMISSIONAL',
    appointmentDate: '12/05/2026',
    matchedExams: Array.from({ length: matchedCount }).map((_, index) => ({
      name: `Exame ${index + 1}`,
      group: 'ECG',
    })),
    status,
    error: status === 'FAILED' ? 'Erro de teste' : undefined,
  });

  it('compacta o relatorio mantendo agregados e limites de exemplos', () => {
    const report: ScrapeReport = {
      timestamp: new Date('2026-05-12T12:00:00.000Z'),
      processedCount: 10,
      successCount: 4,
      matchedExamsTotal: 6,
      details: [
        makeDetail('Paciente 1', 'Empresa A', 'Medical', 'SUCCESS', 2),
        makeDetail('Paciente 2', 'Empresa A', 'Medical', 'SUCCESS', 1),
        makeDetail('Paciente 3', 'Empresa B', 'Worklab', 'SUCCESS', 1),
        makeDetail('Paciente 4', 'Empresa C', 'Medical', 'SUCCESS', 2),
        makeDetail('Paciente 5', 'Empresa D', 'Medical', 'FAILED'),
        makeDetail('Paciente 6', 'Empresa E', 'Cedill', 'FAILED'),
      ],
    };

    const view = buildScraperReportEmailView(report, {
      maxSuccessExamples: 2,
      maxFailureExamples: 1,
    });

    expect(view.providerSummaries).toEqual([
      {
        provider: 'Medical',
        successCount: 3,
        failedCount: 1,
        matchedExamsTotal: 5,
      },
      {
        provider: 'Worklab',
        successCount: 1,
        failedCount: 0,
        matchedExamsTotal: 1,
      },
      {
        provider: 'Cedill',
        successCount: 0,
        failedCount: 1,
        matchedExamsTotal: 0,
      },
    ]);
    expect(view.topCompanies).toEqual([
      { company: 'Empresa A', successCount: 2, matchedExamsTotal: 3 },
      { company: 'Empresa C', successCount: 1, matchedExamsTotal: 2 },
      { company: 'Empresa B', successCount: 1, matchedExamsTotal: 1 },
    ]);
    expect(view.successExamples).toHaveLength(2);
    expect(view.failureExamples).toHaveLength(1);
    expect(view.omittedSuccessCount).toBe(2);
    expect(view.omittedFailureCount).toBe(1);
  });
});
