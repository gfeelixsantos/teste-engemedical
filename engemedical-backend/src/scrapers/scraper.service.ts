import { Injectable, OnModuleInit } from '@nestjs/common';
import { StructuredLogger } from 'src/utils/logger';
import { Cron } from '@nestjs/schedule';
import { MongoService } from '../mongo/mongo.service';
import { ExamStatus } from '../mongo/enum/scheduling.enum';
import { ExamMatcherService } from './exam-matcher.service';
import { AzureService } from '../azure/azure.service';
import { WorklabScraper } from './providers/worklab.scraper';
import { CedillScraper } from './providers/cedill.scraper';
import { VeitiekaScraper } from './providers/veitieka.scraper';
import { MedicalScraper } from './providers/medical.scraper';
import { AbelScraper } from './providers/abel.scraper';
import { SchedulingDocument } from '../mongo/types/scheduling';
import { ScraperMetricsService } from './scraper-metrics.service';
import { EmailService } from '../nodemailer/nodemailer.service';
import {
  buildMedicalNameSearchVariants,
  buildNameSearchVariants,
  buildCedillNameSearchVariants,
} from './utils/name-normalization.util';
import {
  matchesAllowedGroups,
  normalizeScraperGroup,
} from './utils/group-normalization.util';
import {
  SCRAPER_ALLOWED_TIMES_LABEL,
  SCRAPER_TIME_ZONE,
  SCRAPER_WINDOW_END_MINUTES,
  SCRAPER_WINDOW_START_MINUTES,
} from './utils/scraper-schedule.util';
import {
  buildSearchAttemptSummary,
} from './utils/scraper-diagnostics.util';
import { buildScraperReportEmailView } from './utils/scraper-report-email.util';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const SCRAPER_AUTOMATIC_SCHEDULE = '0 6,9,14,18 * * *';
const SCRAPER_MIDDAY_SCHEDULE = '30 11 * * *';

const DEFAULT_SCRAPER_REPORT_RECIPIENTS = [
  'enfermagem@cmsocupacional.com.br',
  'enfermagem.joice@cmsocupacional.com.br',
  'liberacao@cmsocupacional.com.br',
  'draandrea@cmsocupacional.com.br',
  'tecnologia@cmsocupacional.com.br',
];

export interface ScrapeReport {
  timestamp: Date;
  processedCount: number;
  successCount: number;
  matchedExamsTotal: number;
  details: Array<{
    patient: string;
    company: string;
    cpf: string;
    provider: string;
    examType: string;
    appointmentDate: string;
    matchedExams: Array<{ name: string; group: string; confidence?: number }>;
    status: 'SUCCESS' | 'NO_MATCH' | 'FAILED';
    error?: string;
  }>;
}

@Injectable()
export class ScraperService implements OnModuleInit {
  private isProcessing = false;
  private readonly reportRecipients = (
    process.env.SCRAPER_REPORT_RECIPIENT ||
    DEFAULT_SCRAPER_REPORT_RECIPIENTS.join(',')
  )
    .split(',')
    .map((recipient) => recipient.trim())
    .filter(Boolean)
    .join(',');
  private readonly providerCallTimeoutMs = parsePositiveInt(
    process.env.SCRAPER_PROVIDER_CALL_TIMEOUT_MS,
    300000,
  );
  private readonly docProcessingTimeoutMs = parsePositiveInt(
    process.env.SCRAPER_DOC_TIMEOUT_MS,
    180000,
  );
  private readonly canonicalGroups = {
    LABORATORIO: 'LABORATORIO',
    RAIOX: 'RAIOX',
    EEG: 'EEG',
    ECG: 'ECG',
  } as const;

  constructor(
    private readonly mongoService: MongoService,
    private readonly azureService: AzureService,
    private readonly examMatcher: ExamMatcherService,
    private readonly metrics: ScraperMetricsService,
    private readonly emailService: EmailService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(ScraperService.name);
  }

  async onModuleInit() {
    this.logger.log({
      event: 'SCRAPER_AUTOMATIC_SCHEDULE_CONFIGURED',
      message:
        'Scraper automatico configurado para horario comercial no timezone de negocio.',
      timeZone: SCRAPER_TIME_ZONE,
      allowedTimes: SCRAPER_ALLOWED_TIMES_LABEL,
    });
  }

  @Cron(SCRAPER_AUTOMATIC_SCHEDULE, { timeZone: SCRAPER_TIME_ZONE })
  async handleAutomaticScraping() {
    this.logger.log({
      event: 'SCRAPER_CRON_TRIGGERED',
      message: 'Iniciando rotina automatica do scraper (06, 09, 14, 18 hrs).',
    });
    await this.runAutomaticScraping('cron');
  }

  @Cron(SCRAPER_MIDDAY_SCHEDULE, { timeZone: SCRAPER_TIME_ZONE })
  async handleMiddayScraping() {
    this.logger.log({
      event: 'SCRAPER_MIDDAY_CRON_TRIGGERED',
      message: 'Iniciando rotina automatica de meio-dia do scraper (11:30 hrs).',
    });
    await this.runAutomaticScraping('cron');
  }

  /**
   * Executa um ciclo completo do scraper manualmente, sem restrição de janela horária.
   * Usado por scripts de produção e triggers externos (ex: scraper:run-now).
   */
  async runManual(): Promise<void> {
    this.logger.log({
      event: 'SCRAPER_MANUAL_TRIGGER',
      message: 'Execucao manual do scraper iniciada fora do cron automatico.',
    });
    await this.handleScraping('manual');
  }

  /**
   * Execução no startup (SCRAPER_RUN_ON_STARTUP=true) — processa APENAS Veitieka e Cedill.
   * Usado para debug/investigação de provedores específicos.
   */
  async runStartup(): Promise<void> {
    this.logger.log({
      event: 'SCRAPER_STARTUP_TRIGGER',
      message: 'Execucao de startup do scraper (Veitieka + Cedill apenas).',
    });

    const report: ScrapeReport = {
      timestamp: new Date(),
      processedCount: 0,
      successCount: 0,
      matchedExamsTotal: 0,
      details: [],
    };

    try {
      const pendingSchedulings = await this.fetchPendingSchedulings();
      this.logger.log({
        event: 'SCRAPER_PENDING_DOCS_FOUND',
        message: `Startup: Encontrados ${pendingSchedulings.length} agendamentos com exames pendentes.`,
      });

      report.processedCount = pendingSchedulings.length;

      // APENAS Veitieka (RaioX) e Cedill (Laboratorio)
      await this.processBatch(
        'Veitieka',
        pendingSchedulings,
        [this.canonicalGroups.RAIOX],
        report,
      );
      await this.processBatch(
        'Cedill',
        pendingSchedulings,
        ['Laboratório', 'LABORATORIO'],
        report,
      );

      await this.sendReportEmail(report);

      this.logger.log({
        event: 'SCRAPER_STARTUP_CYCLE_FINISHED',
        message: 'Ciclo de startup finalizado.',
        successCount: report.successCount,
      });
    } catch (error) {
      this.logger.error(
        `Erro critico no ciclo de startup: ${error.message}`,
      );
    }
  }

  private isWithinScraperWindow(now: Date = new Date()): boolean {
    const nowInBusinessTz = new Intl.DateTimeFormat('en-US', {
      timeZone: SCRAPER_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const hour = Number(
      nowInBusinessTz.find((part) => part.type === 'hour')?.value ?? '0',
    );
    const minute = Number(
      nowInBusinessTz.find((part) => part.type === 'minute')?.value ?? '0',
    );
    const totalMinutes = hour * 60 + minute;

    return (
      totalMinutes >= SCRAPER_WINDOW_START_MINUTES &&
      totalMinutes <= SCRAPER_WINDOW_END_MINUTES
    );
  }

  private async runAutomaticScraping(trigger: 'startup' | 'cron') {
    if (!this.isWithinScraperWindow()) {
      this.logger.warn({
        event: 'SCRAPER_AUTOMATIC_EXECUTION_SKIPPED_OUTSIDE_WINDOW',
        message:
          'Execucao automatica do scraper ignorada por estar fora da janela operacional.',
        trigger,
        timeZone: SCRAPER_TIME_ZONE,
        allowedTimes: SCRAPER_ALLOWED_TIMES_LABEL,
      });
      return;
    }

    await this.handleScraping(trigger);
  }

  private async handleScraping(trigger: 'startup' | 'cron' | 'manual') {
    if (this.isProcessing) {
      this.logger.warn(
        `Scraping já em andamento. Pulando execução (${trigger}).`,
      );
      return;
    }

    this.isProcessing = true;
    this.logger.debug(`Iniciando ciclo de scraping (${trigger}).`);

    const report: ScrapeReport = {
      timestamp: new Date(),
      processedCount: 0,
      successCount: 0,
      matchedExamsTotal: 0,
      details: [],
    };

    try {
      const pendingSchedulings = await this.fetchPendingSchedulings();
      this.logger.log({
        event: 'SCRAPER_PENDING_DOCS_FOUND',
        message: `Encontrados ${pendingSchedulings.length} agendamentos com exames pendentes.`,
        count: pendingSchedulings.length,
      });

      report.processedCount = pendingSchedulings.length;

      if (pendingSchedulings.length > 0) {
        // Executa por provedor (Lotes)
        await this.processBatch(
          'Veitieka',
          pendingSchedulings,
          [this.canonicalGroups.RAIOX],
          report,
        );
        await this.processBatch(
          'Worklab',
          pendingSchedulings,
          ['Laboratório', 'LABORATORIO'],
          report,
        );
        await this.processBatch(
          'Cedill',
          pendingSchedulings,
          ['Laboratório', 'LABORATORIO'],
          report,
        );
        await this.processBatch(
          'Abel',
          pendingSchedulings,
          ['Laboratório', 'LABORATORIO'],
          report,
        );
        await this.processBatch(
          'Medical',
          pendingSchedulings,
          [
            this.canonicalGroups.EEG,
            this.canonicalGroups.ECG,
            this.canonicalGroups.RAIOX,
          ],
          report,
        );
      }

      // Envia o e-mail em todos os ciclos (cron ou manual), mesmo que pendingSchedulings esteja vazio.
      // Isso atende à regra de "ciência" solicitada (heartbeat da rotina).
      await this.sendReportEmail(report);

      this.logger.log({
        event: 'SCRAPER_CYCLE_FINISHED',
        message: `Ciclo de scraping finalizado com sucesso (${trigger}).`,
        processedCount: report.processedCount,
        successCount: report.successCount,
      });
    } catch (error) {
      this.logger.error(
        `Erro crítico no ciclo de scraping (${trigger}): ${error.message}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async fetchPendingSchedulings(): Promise<SchedulingDocument[]> {
    if (!this.mongoService.schedulingsCollection) {
      this.logger.warn(
        '[ScraperService] MongoDB ainda não pronto. Aguardando sinal de conexão (até 120s)...',
      );
      try {
        // Aguarda o MongoService sinalizar que a conexão está pronta
        // com timeout de 120s como safety net
        await Promise.race([
          this.mongoService.whenReady(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout 120s')), 120000)
          ),
        ]);
        this.logger.log('[ScraperService] MongoDB disponível. Prosseguindo com scraper.');
      } catch (err) {
        this.logger.error(
          `[ScraperService] MongoDB indisponível após 120s. Abortando ciclo. ${err instanceof Error ? err.message : String(err)}`,
        );
        return [];
      }
    }
    return (await this.mongoService.schedulingsCollection
      .find({
        'EXAMES.status': ExamStatus.AGUARDANDO_RESULTADO,
      })
      .sort({ _id: 1 })
      .toArray()) as unknown as SchedulingDocument[];
  }

  private async processBatch(
    provider: string,
    docs: SchedulingDocument[],
    allowedGroups: string[],
    report: ScrapeReport,
  ) {
    const relevantDocs = docs.filter(
      (doc) =>
        this.getPendingExamsByAllowedGroups(doc, allowedGroups).length > 0,
    );

    if (relevantDocs.length === 0) return;

    this.logger.debug(
      `Iniciando lote ${provider} com ${relevantDocs.length} documentos.`,
    );
    this.metrics.markStarted(provider);
    const scraper = this.createScraper(provider);
    let providerFailed = false;

    try {
      if (typeof scraper.login === 'function') {
        await this.withTimeout<void>(
          `[${provider}] login`,
          this.providerCallTimeoutMs,
          () => scraper.login(),
        );
      }

      for (const doc of relevantDocs) {
        try {
          const pendingExams = this.getPendingExamsByAllowedGroups(
            doc,
            allowedGroups,
          );
          const pendingGroups = [
            ...new Set(
              pendingExams.map((exam) => normalizeScraperGroup(exam.grupo)),
            ),
          ];
          let downloadedPdfCount = 0;
          let candidateCount = 0;

          this.logger.debug(
            `[SCRAPER][DOC] provider=${provider} patient="${doc.NOME}" pendingGroups=${pendingGroups.join(',') || 'NONE'} examsToMatch=${pendingExams.length}`,
          );

          const results = await this.searchPatientWithNameFallback(
            scraper,
            provider,
            doc,
            pendingGroups,
          );
          candidateCount = results.length;
          const seenCandidateIds = new Set<string>();
          if (results && results.length > 0) {
            this.metrics.incrementAnalyzed(provider);
            for (let resultIndex = 0; resultIndex < results.length; resultIndex++) {
              const result = results[resultIndex];
              // Deduplicate by candidateId — portal can return duplicate entries
              if (result.id && seenCandidateIds.has(result.id)) {
                this.logger.debug(
                  `[SCRAPER][SKIP_DUPLICATE] provider=${provider} patient="${doc.NOME}" candidateId=${result.id}`,
                );
                continue;
              }
              if (result.id) seenCandidateIds.add(result.id);



              this.logger.log({
                event: 'SCRAPER_PROVIDER_CANDIDATE_SELECTED',
                provider,
                patient: doc.NOME,
                schedulingId: String(doc._id),
                candidatePosition: resultIndex + 1,
                candidateCount: results.length,
                candidateId: result.id ?? null,
                candidateName: result.patientName ?? null,
                candidateDate: result.date ?? null,
                candidateStatus: result.status ?? null,
                candidateScore:
                  typeof result.score === 'number' ? result.score : null,
              });
              const pdfBuffer = await this.withTimeout<Buffer | null>(
                `[${provider}] download laudo ${doc.NOME}`,
                this.providerCallTimeoutMs,
                () => scraper.downloadReport(result),
              );
              if (pdfBuffer) {
                downloadedPdfCount++;
                const stillHasPending = await this.withTimeout(
                  `[${provider}] processamento do laudo ${doc.NOME}`,
                  this.docProcessingTimeoutMs,
                  () =>
                    this.handleResultFound(
                      doc,
                      pdfBuffer,
                      provider,
                      allowedGroups,
                      downloadedPdfCount,
                      result,
                      report,
                    ),
                );
                if (!stillHasPending) break;
              }
            }
          }

          this.logger.debug(
            `[SCRAPER][DOC][SUMMARY] provider=${provider} patient="${doc.NOME}" downloadedPdfs=${downloadedPdfCount}`,
          );
          this.logger.log({
            event: 'SCRAPER_DOCUMENT_FUNNEL_SUMMARY',
            provider,
            patient: doc.NOME,
            schedulingId: String(doc._id),
            appointmentDate: doc.DATAAGENDAMENTO,
            pendingExamCount: pendingExams.length,
            pendingGroups,
            candidateCount,
            downloadedPdfCount,
          });
        } catch (docError) {
          this.logger.error(
            `Erro ao processar ${doc.NOME} (${provider}): ${docError.message}`,
          );
          report.details.push({
            patient: doc.NOME,
            company: doc.NOMEEMPRESA || 'Empresa não identificada',
            cpf: doc.CPFFUNCIONARIO,
            provider,
            examType: doc.TIPOEXAMENOME || 'Geral',
            appointmentDate: doc.DATAAGENDAMENTO,
            matchedExams: [],
            status: 'FAILED',
            error: docError.message,
          });
        }
      }
    } catch (providerError) {
      providerFailed = true;
      this.metrics.updateStatus(provider, 'Erro');
      this.logger.error(
        `Erro no provedor ${provider}: ${providerError.message}`,
      );
    } finally {
      await scraper?.cleanup?.().catch((err: any) =>
        this.logger.warn(`[${provider}] cleanup error: ${err.message}`),
      );
      if (!providerFailed) {
        this.metrics.markFinished(provider);
      }
    }
  }

  private getPendingExamsByAllowedGroups(
    doc: SchedulingDocument,
    allowedGroups: readonly string[],
  ) {
    return (doc.EXAMES || []).filter(
      (ex) =>
        ex.status === ExamStatus.AGUARDANDO_RESULTADO &&
        matchesAllowedGroups(ex.grupo ?? '', allowedGroups),
    );
  }

  private async searchPatientWithNameFallback(
    scraper: any,
    provider: string,
    doc: SchedulingDocument,
    pendingGroups?: string[],
  ): Promise<any[]> {
    const patientName = doc.NOME;
    const cpf = doc.CPFFUNCIONARIO;
    const variants =
      provider === 'Medical'
        ? [...new Set(buildMedicalNameSearchVariants(patientName))]
        : provider === 'Cedill'
          ? buildCedillNameSearchVariants(patientName)
          : buildNameSearchVariants(patientName);
    const attempts: Array<{ query: string; resultCount: number }> = [];

    const searchContext = {
      appointmentDate: doc.DATAAGENDAMENTO,
      schedulingId: String(doc._id),
      pendingGroups: pendingGroups ?? [],
    };

    for (let idx = 0; idx < variants.length; idx++) {
      const query = variants[idx];
      const results = await this.withTimeout<any[]>(
        `[${provider}] busca paciente ${patientName} (consulta: ${query})`,
        this.providerCallTimeoutMs,
        () => scraper.searchPatient(query, searchContext),
      );
      attempts.push({
        query,
        resultCount: Array.isArray(results) ? results.length : 0,
      });

      if (Array.isArray(results) && results.length > 0) {
        const rankedResults = results;

        if (idx > 0) {
          this.logger.debug(
            `[${provider}] paciente "${patientName}" encontrado com nome normalizado "${query}".`,
          );
        }
        this.logger.log({
          event: 'SCRAPER_PATIENT_SEARCH_SUMMARY',
          provider,
          patient: patientName,
          ...buildSearchAttemptSummary(variants, attempts),
        });
        return rankedResults;
      }
    }

    // Fallback: buscar por CPF quando o nome não encontrou resultado
    if (cpf && provider === 'Medical') {
      const cpfClean = cpf.replace(/\D/g, '');
      if (cpfClean.length >= 11) {
        this.logger.debug(
          `[${provider}] busca por nome falhou para "${patientName}". Tentando busca por CPF: ${cpfClean}`,
        );
        const cpfResults = await this.withTimeout<any[]>(
          `[${provider}] busca paciente ${patientName} (CPF: ${cpfClean})`,
          this.providerCallTimeoutMs,
          () => scraper.searchPatient(cpfClean, searchContext),
        );
        attempts.push({
          query: `CPF:${cpfClean}`,
          resultCount: Array.isArray(cpfResults) ? cpfResults.length : 0,
        });

        if (Array.isArray(cpfResults) && cpfResults.length > 0) {
          this.logger.debug(
            `[${provider}] paciente "${patientName}" encontrado via CPF "${cpfClean}".`,
          );
          this.logger.log({
            event: 'SCRAPER_PATIENT_SEARCH_SUMMARY',
            provider,
            patient: patientName,
            ...buildSearchAttemptSummary(variants, attempts),
          });
          return cpfResults;
        }
      }
    }

    this.logger.warn({
      event: 'SCRAPER_PATIENT_SEARCH_EMPTY',
      provider,
      patient: patientName,
      ...buildSearchAttemptSummary(variants, attempts),
    });
    return [];
  }

  private async withTimeout<T>(
    label: string,
    timeoutMs: number,
    operation: () => Promise<T>,
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new Error(
            `${label} ultrapassou o limite de ${Math.floor(timeoutMs / 1000)}s`,
          ),
        );
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  private createScraper(provider: string): any {
    switch (provider) {
      case 'Worklab':
        return new WorklabScraper();
      case 'Cedill':
        return new CedillScraper();
      case 'Veitieka':
        return new VeitiekaScraper();
      case 'Medical':
        return new MedicalScraper();
      case 'Abel':
        return new AbelScraper();
      default:
        throw new Error(`Provedor desconhecido: ${provider}`);
    }
  }

  /**
   * Extrai o nome da empresa do texto do laudo Cedill.
   * O laudo exibe o campo "Empresa" numa linha após o cabeçalho.
   * Ex: "Empresa\nINDUSTRIA DE FRIOS E EMBUTIDOS NALIN LTDA"
   */
  private extractCedillCompanyFromText(text: string): string | null {
    if (!text) return null;

    // Padrão 1: campo "Empresa" seguido do valor na mesma linha ou na próxima
    const inlineMatch = text.match(/empresa\s*[:\-]?\s*([^\r\n]{3,80})/i);
    if (inlineMatch?.[1]?.trim()) {
      return inlineMatch[1].trim().toUpperCase();
    }

    // Padrão 2: linha que diz "Empresa" seguida de próxima linha com o valor
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      if (/^empresa$/i.test(lines[i]) && lines[i + 1]) {
        return lines[i + 1].toUpperCase();
      }
    }

    return null;
  }

  // Tokens genéricos de razão social que NÃO devem ser usados na comparação
  private readonly COMPANY_NOISE_TOKENS = new Set([
    'ltda', 'sa', 'ss', 'me', 'eireli', 'epp', 'sas', 'ind', 'com',
    'industria', 'comercio', 'servicos', 'solucoes', 'grupo', 'cia', 'de',
    'do', 'da', 'dos', 'das', 'e', 'em', 'para', 'por', 'no', 'na',
  ]);

  /**
   * Verifica se empresa do laudo e empresa do prontuário têm pelo menos
   * 1 token significativo em comum (≥5 chars, não-genérico).
   */
  private cedillCompanyMatches(reportCompany: string, docCompany: string): boolean {
    const normalize = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const tokenize = (s: string) =>
      normalize(s)
        .split(' ')
        .filter((t) => t.length >= 5 && !this.COMPANY_NOISE_TOKENS.has(t));

    const reportTokens = new Set(tokenize(reportCompany));
    const docTokens = tokenize(docCompany);

    const overlap = docTokens.filter((t) => reportTokens.has(t));
    return overlap.length > 0;
  }

  private async handleResultFound(
    doc: SchedulingDocument,
    pdfBuffer: Buffer,
    provider: string,
    allowedGroups: string[],
    downloadedPdfCount: number,
    candidateMeta: {
      id?: string;
      patientName?: string;
      date?: string;
      status?: string;
      score?: number;
    },
    report: ScrapeReport,
  ): Promise<boolean> {
    const text = await this.examMatcher.extractText(pdfBuffer);
    const pendingExams = this.getPendingExamsByAllowedGroups(
      doc,
      allowedGroups,
    );
    const pendingGroups = [
      ...new Set(pendingExams.map((exam) => normalizeScraperGroup(exam.grupo))),
    ];

    // ── Validação de empresa para Cedill ──────────────────────────────────────
    // O laudo Cedill inclui o campo "Empresa" no PDF. Se o nome da empresa no
    // laudo não tiver tokens em comum com o NOMEEMPRESA do prontuário, o PDF
    // pertence a outro paciente homônimo de outra empresa e deve ser rejeitado.
    if (provider === 'Cedill' && doc.NOMEEMPRESA) {
      const companyInReport = this.extractCedillCompanyFromText(text);
      if (companyInReport) {
        const matches = this.cedillCompanyMatches(companyInReport, doc.NOMEEMPRESA);
        if (!matches) {
          this.logger.warn({
            event: 'SCRAPER_CEDILL_COMPANY_MISMATCH',
            provider,
            patient: doc.NOME,
            schedulingId: String(doc._id),
            expectedCompany: doc.NOMEEMPRESA,
            reportCompany: companyInReport,
            message: 'Laudo Cedill rejeitado: empresa do laudo difere do prontuário (homonimo de outra empresa).',
          });
          return false;
        }
        this.logger.debug(
          `[Cedill][COMPANY_OK] patient="${doc.NOME}" reportCompany="${companyInReport}" docCompany="${doc.NOMEEMPRESA}"`,
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    this.logger.debug(
      `[SCRAPER][MATCHER][INPUT] provider=${provider} patient="${doc.NOME}" pendingGroups=${pendingGroups.join(',') || 'NONE'} downloadedPdfs=${downloadedPdfCount} examsToMatch=${pendingExams.length}`,
    );
    this.logger.log({
      event: 'SCRAPER_REPORT_TEXT_EXTRACTED',
      provider,
      patient: doc.NOME,
      schedulingId: String(doc._id),
      downloadedPdfCount,
      pdfBytes: pdfBuffer.length,
      textLength: text.trim().length,
      textPreview: text.replace(/\s+/g, ' ').trim().slice(0, 180),
      candidateId: candidateMeta?.id ?? null,
      candidateName: candidateMeta?.patientName ?? null,
      candidateDate: candidateMeta?.date ?? null,
      candidateStatus: candidateMeta?.status ?? null,
      candidateScore:
        typeof candidateMeta?.score === 'number' ? candidateMeta.score : null,
    });

    const matchedResults = await this.examMatcher.matchExams(
      text,
      pendingExams,
      {
        nome: doc.NOME,
        cpf: doc.CPFFUNCIONARIO,
        dataAgendamento: doc.DATAAGENDAMENTO,
        dataNascimento: doc.DATANASCIMENTO,
      },
      provider,
    );
    const matchedCodigos = matchedResults.map(r => r.codigoExame);

    this.logger.debug(
      `[SCRAPER][MATCHER][OUTPUT] provider=${provider} patient="${doc.NOME}" matchesAccepted=${matchedCodigos.length}`,
    );
    this.logger.log({
      event: 'SCRAPER_MATCH_RESULT_SUMMARY',
      provider,
      patient: doc.NOME,
      schedulingId: String(doc._id),
      matchesAccepted: matchedCodigos.length,
      matchedExamCodes: matchedCodigos,
      pendingExamCodes: pendingExams.map((exam) => exam.codigoExame),
    });

    if (matchedCodigos.length > 0) {
      this.logger.debug(
        `IA casou ${matchedCodigos.length} exames para ${doc.NOME} (${provider}).`,
      );

      report.successCount++;
      report.matchedExamsTotal += matchedCodigos.length;

      const matchedExamsWithGroup = doc.EXAMES.filter((ex) =>
        matchedCodigos.includes(ex.codigoExame),
      ).map((ex) => {
        const matchResult = matchedResults.find((r) => r.codigoExame === ex.codigoExame);
        return { name: ex.nomeExame, group: ex.grupo || 'Geral', confidence: matchResult?.confidence };
      });

      report.details.push({
        patient: doc.NOME,
        company: doc.NOMEEMPRESA || 'Empresa não identificada',
        cpf: doc.CPFFUNCIONARIO,
        provider,
        examType: doc.TIPOEXAMENOME || 'Geral',
        appointmentDate: doc.DATAAGENDAMENTO,
        matchedExams: matchedExamsWithGroup,
        status: 'SUCCESS',
      });

      this.metrics.incrementReceived(provider);

      const fileGroupName =
        doc.EXAMES.find((ex) => matchedCodigos.includes(ex.codigoExame))
          ?.grupo || 'Exame';
      const fileName = `${fileGroupName}.pdf`;

      const url = await this.azureService.uploadGenericFile(
        doc,
        pdfBuffer,
        fileName,
        `SCRAPER_${provider.toUpperCase()}`,
      );

      // Atualiza no MongoDB via método unificado (o mesmo que o worker usava via callback)
      // Lógica de atualização por grupo: quando um novo exame é recebido,
      // todos os exames do mesmo grupo que já estão FINALIZADOS também são atualizados
      // com a nova URL (PDFs são cumulativos)
      const updateGroupName = doc.EXAMES.find((ex) => matchedCodigos.includes(ex.codigoExame))
        ?.grupo || '';
      
      const finishedExamsInGroup = (doc.EXAMES || []).filter(
        (ex) =>
          ex.grupo === updateGroupName &&
          ex.status === ExamStatus.FINALIZADO &&
          !matchedCodigos.includes(ex.codigoExame)
      );
      
      const finishedCodesInGroup = finishedExamsInGroup.map((ex) => ex.codigoExame);
      const allCodesToUpdate = [...new Set([...matchedCodigos, ...finishedCodesInGroup])];

      if (finishedCodesInGroup.length > 0) {
        this.logger.log(
          `[GROUP_UPDATE] Atualizando ${finishedCodesInGroup.length} exames finalizados do grupo "${updateGroupName}" junto com os novos exames: ${finishedCodesInGroup.join(', ')}`,
        );
      }

      await this.mongoService.applyExamResultFromWorker({
        schedulingId: doc._id.toString(),
        examCodes: allCodesToUpdate,
        url,
        source: `SCRAPER_${provider.toUpperCase()}`,
      });

      // Mantém o snapshot em memória consistente com o estado persistido no Mongo.
      // Isso evita reprocessamento do mesmo exame nos próximos batches deste ciclo.
      const persistedCodes = new Set(allCodesToUpdate);
      doc.EXAMES = (doc.EXAMES || []).map((ex) =>
        persistedCodes.has(ex.codigoExame)
          ? { ...ex, status: ExamStatus.FINALIZADO, url }
          : ex,
      );
      this.logger.debug(
        `[IDEMPOTENCY][SCRAPER_CYCLE] Estado local atualizado schedulingId=${doc._id} provider=${provider} examCodes=${matchedCodigos.join(',')}`,
      );

      const hasStillPending = doc.EXAMES.some(
        (ex) =>
          !matchedCodigos.includes(ex.codigoExame) &&
          ex.status === ExamStatus.AGUARDANDO_RESULTADO &&
          matchesAllowedGroups(ex.grupo ?? '', allowedGroups),
      );
      return hasStillPending;
    }

    return true;
  }

  private async sendReportEmail(report: ScrapeReport) {
    const hasSuccess = report.details.some((d) => d.status === 'SUCCESS');
    const failedCount = report.details.filter(
      (d) => d.status === 'FAILED',
    ).length;
    const emailView = buildScraperReportEmailView(report, {
      maxSuccessExamples: Number.MAX_SAFE_INTEGER,
      maxFailureExamples: Number.MAX_SAFE_INTEGER,
    });

    this.logger.debug(
      `Gerando e enviando relatório por e-mail (sucesso=${report.successCount} falhas=${failedCount} processados=${report.processedCount})...`,
    );

    const statusMap: Record<string, { l: string; c: string }> = {
      SUCCESS: { l: 'Concluído', c: 'ok' },
      NO_MATCH: { l: 'Pendente', c: 'warn' },
      FAILED: { l: 'Erro', c: 'err' },
    };

    const formatExams = (exams: Array<{ name: string; group: string; confidence?: number }>) => {
      if (!exams.length) return '<small>-</small>';
      const groups: Record<string, { name: string; conf?: number }[]> = {};
      for (const ex of exams) {
        if (!groups[ex.group]) groups[ex.group] = [];
        groups[ex.group].push({ name: ex.name, conf: ex.confidence });
      }
      return Object.entries(groups)
        .map(([group, list]) => {
          const items = list.map((ex) => {
            if (ex.conf === undefined) return ex.name;
            const perc = ex.conf * 100;
            const cls = perc >= 90 ? 'grn' : 'warn';
            return `${ex.name} <span class="badge ${cls}">${perc.toFixed(0)}%</span>`;
          }).join('<br>');
          return `<b>${group}:</b><br>${items}`;
        }).join('<br><br>');
    };

    const formatCpf = (cpf: string) => {
      const digits = String(cpf || '').replace(/\D/g, '');
      if (digits.length !== 11) return cpf || '-';
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    };

    // Azure Queue: 64KB/msg. Template otimizado (~4KB base, ~270B/item).
    // 60 itens ~15KB base64, margem >75%.
    const MAX_ITEMS_PER_EMAIL = 60;
    const allSuccesses = emailView.successExamples;
    const allFailures = emailView.failureExamples;

    const chunks: Array<{ successes: typeof allSuccesses; failures: typeof allFailures }> = [];
    let sIdx = 0;
    let fIdx = 0;

    while (sIdx < allSuccesses.length || fIdx < allFailures.length) {
      chunks.push({
        successes: allSuccesses.slice(sIdx, sIdx + MAX_ITEMS_PER_EMAIL),
        failures: allFailures.slice(fIdx, fIdx + MAX_ITEMS_PER_EMAIL),
      });
      sIdx += MAX_ITEMS_PER_EMAIL;
      fIdx += MAX_ITEMS_PER_EMAIL;
    }

    if (chunks.length === 0) {
      chunks.push({ successes: [], failures: [] });
    }

    let chunkIndex = 1;
    for (const chunk of chunks) {
      const groupedByCompany: Record<string, typeof allSuccesses> = {};
      for (const detail of chunk.successes) {
        if (!groupedByCompany[detail.company]) groupedByCompany[detail.company] = [];
        groupedByCompany[detail.company].push(detail);
      }

      let companySections = '';
      for (const [company, details] of Object.entries(groupedByCompany)) {
        const rows = details.map((d) => {
          const st = statusMap[d.status] ?? { l: d.status, c: 'neu' };
          return `<tr>
<td>${d.patient}<br><small>CPF: ${formatCpf(d.cpf)}</small><br><small>${d.examType} &bull; ${d.appointmentDate}</small></td>
<td><span class="badge neu">${d.provider}</span></td>
<td><span class="badge ${st.c}">${st.l}</span></td>
<td>${formatExams(d.matchedExams)}${d.error ? `<br><small style="color:#b91c1c">${d.error}</small>` : ''}</td>
</tr>`;
        }).join('');

        companySections += `<div class="company"><h2>${company}</h2>
<table><tr><th>Funcionário</th><th>Portal</th><th>Status</th><th>Exames / Assertividade</th></tr><tbody>${rows}</tbody></table></div>`;
      }

      const failureRows = chunk.failures.map((d) =>
        `<tr><td>${d.patient}</td><td>${d.provider}</td><td style="color:#b91c1c">${(d.error || '-').slice(0, 120)}</td></tr>`,
      ).join('');

      const failureSection = failureRows
        ? `<div class="company"><h2 style="color:#991b1b">Falhas de Processamento</h2>
<table style="border:1px solid #fecaca;border-radius:6px;overflow:hidden"><tr style="background:#fef2f2"><th style="color:#7f1d1d">Funcionário</th><th style="color:#7f1d1d">Portal</th><th style="color:#7f1d1d">Erro</th></tr><tbody>${failureRows}</tbody></table></div>`
        : '';

      const partSuffix = chunks.length > 1 ? ` (Parte ${chunkIndex}/${chunks.length})` : '';
      const ts = report.timestamp.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      const noResultsSection = !hasSuccess
        ? `<div style="margin:30px 0;padding:30px;background:#f8fafc;border-radius:8px;border:1px dashed #cbd5e1;text-align:center">
<div style="font-size:36px;margin-bottom:12px">🔍</div>
<div style="font-size:16px;font-weight:700;color:#334155;margin-bottom:8px">Nenhum laudo encontrado neste ciclo</div>
<div style="font-size:14px;color:#64748b">Verificados <b>${report.processedCount}</b> prontuário(s). Nenhum laudo disponível no momento.</div>
</div>`
        : '';

      const legendSection = hasSuccess
        ? `<div class="legend"><b>Assertividade (IA):</b>
<span style="background:#10b981"></span> <b>Verde (&ge;90%)</b> Match seguro &nbsp;|&nbsp;
<span style="background:#f59e0b"></span> <b>Laranja (&lt;90%)</b> Verificar manualmente</div>`
        : '';

      const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:16px;background:#f4f7f6}
.wrap{max-width:900px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.header{background:linear-gradient(135deg,#10b981,#047857);padding:20px 24px;text-align:center;color:#fff}
.h1{margin:6px 0 0;font-size:20px;font-weight:700}
.stats{display:flex;gap:10px;padding:16px 20px;flex-wrap:wrap}
.stat{flex:1;min-width:90px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px}
.stat b{display:block;font-size:20px}
table{width:100%;border-collapse:collapse}
th{background:#f8fafc;padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#64748b;text-align:left;border-bottom:2px solid #e2e8f0}
td{padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;vertical-align:top;color:#334155}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
.ok{background:#dcfce7;color:#15803d}.grn{background:#d1fae5;color:#059669;border:1px solid #a7f3d0}
.warn{background:#fef3c7;color:#d97706;border:1px solid #fde68a}.err{background:#fee2e2;color:#b91c1c}
.neu{background:#f1f5f9;color:#475569}
.company{margin-top:20px}.company h2{font-size:15px;color:#1e293b;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid #f1f5f9;display:flex;align-items:center;gap:6px}
.company h2::before{content:'';display:inline-block;width:3px;height:16px;background:#10b981;border-radius:2px}
.legend{margin:16px 0;background:#fdfdfd;border:1px dashed #cbd5e1;border-radius:6px;padding:10px 14px;font-size:12px;color:#475569}
.legend span{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:middle}
.footer{padding:12px 16px;text-align:center;color:#94a3b8;font-size:11px;background:#f8fafc;border-top:1px solid #e2e8f0}
small{color:#64748b;font-size:12px}
</style></head><body>
<div class="wrap">
<div class="header"><img src="https://cmsocupacional.com.br/images/logo.png" height="40" style="filter:brightness(0)invert(1);margin-bottom:8px">
<h1 class="h1">Relatório de Coleta${partSuffix}</h1></div>
<div style="text-align:center;padding:10px 20px;color:#64748b;font-size:12px">Ciclo: <b>${ts}</b></div>
<div class="stats">
<div class="stat"><b>${report.processedCount}</b>Analisados</div>
<div class="stat" style="border-top:3px solid #10b981"><b style="color:#166534">${report.successCount}</b>Atualizados</div>
<div class="stat" style="border-top:3px solid #3b82f6"><b style="color:#1e40af">${report.matchedExamsTotal}</b>Vinculados</div>
<div class="stat" style="border-top:3px solid #ef4444"><b style="color:#991b1b">${failedCount}</b>Erros</div>
</div>
${legendSection}
${hasSuccess ? companySections + failureSection : noResultsSection}
<div class="footer">E-mail automático CMSO 360. Não responda.</div>
</div></body></html>`;

      try {
        await this.emailService.sendEmail({
          to: this.reportRecipients,
          subject: hasSuccess
            ? `[Resultados] ${report.successCount} Laudo(s) Encontrado(s) - ${report.timestamp.toLocaleDateString('pt-BR')}${partSuffix}`
            : `[Verificação] Ciclo sem resultados - ${report.processedCount} prontuário(s) - ${report.timestamp.toLocaleDateString('pt-BR')}`,
          template: html,
          from: '',
          cc: '',
          attachment: [],
          templatename: '',
        });
      } catch (error) {
        this.logger.error(
          `Falha ao enviar e-mail de relatório${partSuffix}: ${error.message}. Envio interrompido.`,
        );
        return;
      }

      chunkIndex++;
    }
  }
}
