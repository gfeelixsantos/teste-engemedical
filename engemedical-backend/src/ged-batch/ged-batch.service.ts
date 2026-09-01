import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AzureService } from '../azure/azure.service';
import { MongoService } from '../mongo/mongo.service';
import { PushService } from '../push/push.service';
import { WebsocketGateway } from '../websocket/websocket-connection';
import { WsDownloadArquivoPorSequencialFicha } from '../soc/webservice/download/WsDownloadArquivoPorSequencialFicha';
import { WsDownloadArquivo } from '../soc/webservice/download/WsDownloadArquivo';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const unzipper = require('unzipper');
import {
  CreateGedBatchDto,
  GedBatchJob,
  GedBatchJobDocument,
  GedBatchJobStatus,
  GedBatchScope,
  GedBatchTipo,
  inferScope,
  validateScopeConstraints,
} from './ged-batch.types';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ZipArchive } = require('archiver');
import * as stream from 'stream';
import { mergePdfs } from '../utils/util';
import { ContainerClient } from '@azure/storage-blob';
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import {
  buildSocExportDataUrl,
  getSocExportLayoutCredentials,
} from '../soc/utils/soc-export-data-url';

@Injectable()
export class GedBatchService implements OnModuleInit {
  private readonly logger = new Logger(GedBatchService.name);
  private readonly terminalStatuses: GedBatchJobStatus[] = [
    'completed',
    'failed',
    'partial',
  ];
  private readonly staleTimeoutMs = Math.max(
    60_000,
    Number(process.env.GED_BATCH_STALE_TIMEOUT_MS || 30 * 60_000),
  );
  private readonly retentionDays = Math.max(
    1,
    Number(process.env.GED_BATCH_RETENTION_DAYS || 3),
  );
  private readonly containerName =
    process.env.AZURE_CONTAINER_DOCUMENTS ||
    process.env.AZURE_STORAGE_CONTAINER ||
    'documents';
  private readonly concurrency = Math.max(
    1,
    Number(process.env.GED_BATCH_CONCURRENCY || 3),
  );
  private readonly maxRetries = Math.max(
    1,
    Number(process.env.GED_BATCH_MAX_RETRIES || 2),
  );

  constructor(
    private readonly mongoService: MongoService,
    private readonly azureService: AzureService,
    private readonly pushService: PushService,
    private readonly wsGateway: WebsocketGateway,
  ) {}

  async onModuleInit() {
    await this.expireOrphanJobs();
  }

  private async expireOrphanJobs() {
    const cutoff = new Date(Date.now() - this.staleTimeoutMs);
    const orphanJobs = await this.collection
      .find({
        status: { $in: ['pending', 'processing'] as GedBatchJobStatus[] },
        updatedAt: { $lt: cutoff },
      })
      .toArray();

    if (!orphanJobs.length) return;

    this.logger.warn(`Expiring ${orphanJobs.length} orphan GED batch jobs (stale > ${this.staleTimeoutMs}ms)`);

    for (const job of orphanJobs) {
      const pendingItems = job.items.filter((i) => i.status === 'pending');
      const message = `Lote cancelado automaticamente: servico reiniciou durante o processamento.`;

      await this.collection.updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'failed' as GedBatchJobStatus,
            updatedAt: new Date(),
            failedFuncionarios: job.failedFuncionarios + pendingItems.length,
            processedFuncionarios: job.totalFuncionarios,
            items: job.items.map((i) =>
              i.status === 'pending' ? { ...i, status: 'failed' as const, error: message } : i,
            ),
          },
          $push: { errors: { message } },
        },
      );

      const updated = await this.collection.findOne({ _id: job._id });
      if (updated) this.emitGedBatchStatus(updated);
    }
  }

  private get collection() {
    return this.mongoService.db.collection<GedBatchJobDocument>('ged_batch_jobs');
  }

  private get schedulingsCollection() {
    return this.mongoService.db.collection('schedulings');
  }

  private normalizeSegment(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .trim() || 'empresa';
  }

  private normalizeDocName(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.\-\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  private toPdfFileName(value: string): string {
    const sanitized = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.\-\s]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .trim();
    return sanitized.endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
  }

  private parseDataAgendamento(raw: any): string {
    if (!raw) return 'SD';
    const str = String(raw).trim();
    // ddMMyyyy (ex: "10012026")
    const digits = str.replace(/\D/g, '');
    if (digits.length === 8) {
      return `${digits.slice(4, 8)}${digits.slice(2, 4)}${digits.slice(0, 2)}`;
    }
    // DD/MM/YYYY ou MM/DD/YYYY (ex: "10/01/2026")
    const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (slashMatch) {
      const [, p1, p2, p3] = slashMatch;
      // Assume DD/MM/YYYY (formato brasileiro)
      return `${p3}${p2.padStart(2, '0')}${p1.padStart(2, '0')}`;
    }
    // Fallback: tenta Date
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10).replace(/-/g, '');
    }
    return 'SD';
  }

  private buildProntuarioFileName(doc: any): string {
    const nome = this.normalizeDocName(doc.NOME || 'FUNCIONARIO');
    const tipoExame = this.normalizeDocName(doc.TIPOEXAMENOME || 'EXAME');
    const data = this.parseDataAgendamento(doc.DATAAGENDAMENTO);
    return `PRONTUARIO - ${nome} - ${tipoExame}_${data}.pdf`;
  }

  private buildAsoFileName(doc: any): string {
    const nome = this.normalizeDocName(doc.NOME || 'FUNCIONARIO');
    const data = this.parseDataAgendamento(doc.DATAAGENDAMENTO);
    return `ASO - ${nome}_${data}.pdf`;
  }

  private buildResultBlobName(job: GedBatchJobDocument): string {
    const periodLabel =
      job.periodo?.ano && job.periodo?.mes
        ? `${job.periodo.ano}_${job.periodo.mes}`
        : 'completo';

    return `ged-batch/${job._id}/${this.normalizeSegment(job.empresa.razaoSocial)}_${periodLabel}.zip`;
  }

  private toPublicJob(job: GedBatchJobDocument): GedBatchJob {
    const { _id, ...rest } = job;
    const result = rest.result?.zipBlobName
      ? {
          ...rest.result,
          zipUrl: this.azureService.generateSasUrlFromUrl(
            rest.result.zipBlobName,
          ),
        }
      : rest.result;

    return {
      id: _id,
      ...rest,
      result,
    };
  }

  private async resolveProntuarios(
    scope: GedBatchScope,
    dto: CreateGedBatchDto,
  ): Promise<{ codigoProntuario: string; nome: string; dataAgendamento?: string; tipoExame?: string }[]> {
    switch (scope) {
      case 'prontuario': {
        if (!dto.prontuarios?.length) {
          throw new BadRequestException(
            'scope=prontuario exige exatamente um prontuario no payload.',
          );
        }
        const codigos = dto.prontuarios.map((p) => p.codigoProntuario);
        const docs = await this.schedulingsCollection
          .find({ CODIGOPRONTUARIO: { $in: codigos } })
          .sort({ DATAAGENDAMENTO_DATE: -1 })
          .toArray();
        const lookup = new Map(docs.map((d) => [d.CODIGOPRONTUARIO, d]));
        return dto.prontuarios.map((p) => {
          const doc = lookup.get(p.codigoProntuario);
          return {
            codigoProntuario: p.codigoProntuario,
            nome: p.nome,
            dataAgendamento: doc?.DATAAGENDAMENTO,
            tipoExame: doc?.TIPOEXAMENOME,
          };
        });
      }

      case 'periodo': {
        const prontuarios = await this.mongoService.listGedBatchProntuarios({
          codigoEmpresa: dto.codigoEmpresa,
          periodo: dto.periodo,
        });
        if (!prontuarios.length) {
          throw new BadRequestException(
            'Nenhum prontuario disponivel para o periodo selecionado.',
          );
        }
        return prontuarios;
      }

      case 'empresa':
      default: {
        const prontuarios = await this.mongoService.listGedBatchProntuarios({
          codigoEmpresa: dto.codigoEmpresa,
        });
        if (!prontuarios.length) {
          throw new BadRequestException(
            'Nenhum prontuario disponivel para a empresa selecionada.',
          );
        }
        return prontuarios;
      }
    }
  }

  private isTerminalStatus(status: GedBatchJobStatus): boolean {
    return this.terminalStatuses.includes(status);
  }

  private emitGedBatchStatus(job: GedBatchJobDocument) {
    try {
      this.wsGateway.emitGedBatchStatus({
        jobId: job._id,
        status: job.status,
        totalFuncionarios: job.totalFuncionarios,
        processedFuncionarios: job.processedFuncionarios,
        succeededFuncionarios: job.succeededFuncionarios,
        failedFuncionarios: job.failedFuncionarios,
        result: job.result,
        updatedAt: job.updatedAt instanceof Date
          ? job.updatedAt.toISOString()
          : new Date(job.updatedAt).toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `GED batch job ${job._id}: falha ao emitir status via Socket.IO: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private emitGedBatchProgress(
    job: GedBatchJobDocument,
    item: { codigoProntuario: string; nome: string; status: 'completed' | 'failed'; error?: string },
  ) {
    try {
      this.wsGateway.emitGedBatchProgress({
        jobId: job._id,
        itemCodigoProntuario: item.codigoProntuario,
        itemNome: item.nome,
        itemStatus: item.status,
        error: item.error,
        processedFuncionarios: job.processedFuncionarios,
        totalFuncionarios: job.totalFuncionarios,
        updatedAt: job.updatedAt instanceof Date
          ? job.updatedAt.toISOString()
          : new Date(job.updatedAt).toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `GED batch job ${job._id}: falha ao emitir progresso via Socket.IO: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private isStale(job: GedBatchJobDocument): boolean {
    if (this.isTerminalStatus(job.status)) {
      return false;
    }

    const referenceDate = job.updatedAt || job.createdAt;
    const referenceTime =
      referenceDate instanceof Date
        ? referenceDate.getTime()
        : new Date(referenceDate).getTime();

    return Date.now() - referenceTime >= this.staleTimeoutMs;
  }

  private async expireStaleJob(
    job: GedBatchJobDocument,
  ): Promise<GedBatchJobDocument> {
    if (!this.isStale(job)) {
      return job;
    }

    const now = new Date();
    const pendingItems = job.items.filter((item) => item.status === 'pending');
    const failedFuncionarios = job.failedFuncionarios + pendingItems.length;
    const processedFuncionarios =
      job.succeededFuncionarios + failedFuncionarios;
    const timeoutMinutes = Math.round(this.staleTimeoutMs / 60_000);
    const timeoutMessage = `Lote GED cancelado automaticamente apos ${timeoutMinutes} minuto(s) sem progresso.`;

    const items = job.items.map((item) =>
      item.status === 'pending'
        ? {
            ...item,
            status: 'failed' as const,
            error: timeoutMessage,
          }
        : item,
    );

    await this.collection.updateOne(
      {
        _id: job._id,
        status: { $nin: this.terminalStatuses },
      },
      {
        $set: {
          status: 'failed',
          updatedAt: now,
          processedFuncionarios,
          failedFuncionarios,
          items,
        },
        $push: {
          errors: {
            message: timeoutMessage,
          },
        },
      },
    );

    const expiredJob = await this.collection.findOne({ _id: job._id });
    if (!expiredJob) throw new NotFoundException('GED batch job not found');

    this.logger.warn(`GED batch job ${job._id} expired due to inactivity`);

    this.emitGedBatchStatus(expiredJob);

    this.pushService.sendGedBatchUpdate(this.toPublicJob(expiredJob)).catch((err) => {
      this.logger.error(
        `GED batch job ${job._id}: falha ao enviar push de expiracao: ${err instanceof Error ? err.message : String(err)}`,
      );
    });

    return expiredJob;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // =========================================================================
  // ===============  IN-PROCESS BATCH PROCESSING  ===========================
  // =========================================================================

  async createJob(dto: CreateGedBatchDto, userId: string): Promise<GedBatchJob> {
    const now = new Date();
    const jobId = randomUUID();

    const scope = inferScope(dto);
    validateScopeConstraints(scope, dto);

    const prontuarios = await this.resolveProntuarios(scope, dto);

    const job: GedBatchJobDocument = {
      _id: jobId,
      scope,
      requestedBy: {
        userId,
      },
      empresa: {
        codigoEmpresa: dto.codigoEmpresa,
        razaoSocial: dto.razaoSocial,
      },
      periodo: dto.periodo,
      tipo: dto.tipo,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      totalFuncionarios: prontuarios.length,
      processedFuncionarios: 0,
      succeededFuncionarios: 0,
      failedFuncionarios: 0,
      result: undefined,
      errors: [],
      items: prontuarios.map((p) => ({
        codigoProntuario: p.codigoProntuario,
        nome: p.nome,
        status: 'pending',
        dataAgendamento: p.dataAgendamento,
        tipoExame: p.tipoExame,
      })),
    };

    await this.collection.insertOne(job);

    this.logger.log(`GED batch job ${jobId} created with ${job.totalFuncionarios} items, tipo=${dto.tipo || 'prontuario'}`);

    this.emitGedBatchStatus(job);

    this.processJob(jobId, dto.tipo || 'prontuario').catch((err) => {
      this.logger.error(`GED batch job ${jobId} unhandled error: ${err instanceof Error ? err.message : String(err)}`);
    });

    return this.toPublicJob(job);
  }

  async getJob(jobId: string): Promise<GedBatchJob> {
    let job = await this.collection.findOne({ _id: jobId });
    if (!job) throw new NotFoundException('GED batch job not found');
    job = await this.expireStaleJob(job);
    return this.toPublicJob(job);
  }

  async listJobs(
    userId: string,
    limit = 20,
    skip = 0,
  ): Promise<GedBatchJob[]> {
    const jobs = await this.collection
      .find({ 'requestedBy.userId': userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return jobs.map((job) => this.toPublicJob(job));
  }

  private async updateProgress(
    jobId: string,
    itemCodigoProntuario: string,
    status: 'completed' | 'failed',
    error?: string,
  ): Promise<GedBatchJob | null> {
    const updateResult = await this.collection.updateOne(
      {
        _id: jobId,
        status: { $nin: this.terminalStatuses },
        items: {
          $elemMatch: {
            codigoProntuario: itemCodigoProntuario,
            status: { $nin: ['completed', 'failed'] },
          },
        },
      },
      {
        $set: {
          'items.$.status': status,
          'items.$.error': error || null,
          status: 'processing',
          updatedAt: new Date(),
        },
        ...(status === 'completed'
          ? { $inc: { processedFuncionarios: 1, succeededFuncionarios: 1 } }
          : {
              $inc: { processedFuncionarios: 1, failedFuncionarios: 1 },
              $push: {
                errors: {
                  codigoProntuario: itemCodigoProntuario,
                  message: error || 'Erro desconhecido',
                },
              },
            }),
      },
    );

    if (updateResult.matchedCount === 0) {
      this.logger.debug(
        `GED batch item ${itemCodigoProntuario} already finalized for job ${jobId}, skipping duplicate`,
      );
      return null;
    }

    const updatedJob = await this.collection.findOne({ _id: jobId });
    if (!updatedJob) {
      throw new NotFoundException('GED batch job not found');
    }

    const publicJob = this.toPublicJob(updatedJob);

    this.emitGedBatchStatus(updatedJob);
    this.emitGedBatchProgress(updatedJob, {
      codigoProntuario: itemCodigoProntuario,
      nome: publicJob.items.find((i) => i.codigoProntuario === itemCodigoProntuario)?.nome || itemCodigoProntuario,
      status,
      error,
    });

    return publicJob;
  }

  // =========================================================================
  // ===============  BACKGROUND JOB PROCESSOR  ==============================
  // =========================================================================

  private async processJob(jobId: string, tipo: GedBatchTipo): Promise<void> {
    const job = await this.collection.findOne({ _id: jobId });
    if (!job) {
      this.logger.error(`GED batch job ${jobId} not found, aborting processing`);
      return;
    }

    if (job.status !== 'pending') {
      this.logger.debug(`GED batch job ${jobId} status is ${job.status}, skipping processing`);
      return;
    }

    await this.collection.updateOne(
      { _id: jobId, status: 'pending' },
      { $set: { status: 'processing', updatedAt: new Date() } },
    );

    const processingJob = await this.collection.findOne({ _id: jobId });
    if (processingJob) this.emitGedBatchStatus(processingJob);

    this.logger.log(`GED batch job ${jobId} processing started | ${job.totalFuncionarios} items | tipo=${tipo}`);

    const archive = new ZipArchive('zip', { zlib: { level: 1 } });
    const passthrough = new stream.PassThrough();
    archive.pipe(passthrough);

    let archiveError: string | null = null;

    archive.on('error', (err: Error) => {
      this.logger.error(`[${jobId}] Archive error: ${err.message}`);
      archiveError = err.message;
    });

    passthrough.on('error', (err: Error) => {
      this.logger.error(`[${jobId}] PassThrough error: ${err.message}`);
      archiveError = err.message;
    });

    // Upload stream diretamente para Azure Blob (sem acumular em memória)
    const blobName = this.buildResultBlobName(job);
    const uploadPromise = this.azureService
      .uploadStream(this.containerName, blobName, passthrough, 'application/zip')
      .catch((error: Error) => {
        this.logger.error(`[${jobId}] Error in ZIP upload stream: ${error.message}`);
        throw error;
      });

    type ItemResult = { nome: string; codigoProntuario: string; dataAgendamento?: string; tipoExame?: string; status: 'ok' | 'fail'; error?: string };
    const results: ItemResult[] = [];
    let succeededCount = 0;
    let failedCount = 0;

    const pendingItems = job.items.filter((item) => item.status === 'pending');

    // Processa itens sequencialmente — cada item com try-catch individual
    // para que erro em 1 item não derrube todo o lote com um pequeno delay de 500ms para evitar rate limit do SOC
    for (let i = 0; i < pendingItems.length; i++) {
      const prontuario = pendingItems[i];
      if (archiveError) {
        this.logger.warn(`[${jobId}] Archive stream error detected, skipping remaining items`);
        break;
      }

      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      try {
        const result = await this.processItemWithRetry(
          jobId,
          prontuario.codigoProntuario,
          prontuario.nome,
          tipo,
          job.periodo,
        );

        if (result.status === 'completed' && result.buffer) {
          archive.append(result.buffer, { name: result.fileName || `${prontuario.nome}.pdf` });
          await this.updateProgress(jobId, prontuario.codigoProntuario, 'completed');
          succeededCount++;
          results.push({ nome: prontuario.nome, codigoProntuario: prontuario.codigoProntuario, dataAgendamento: prontuario.dataAgendamento, tipoExame: prontuario.tipoExame, status: 'ok' });
          this.logger.log(`[${jobId}] ${prontuario.nome} OK (${succeededCount}/${pendingItems.length})`);
        } else {
          await this.updateProgress(jobId, prontuario.codigoProntuario, 'failed', result.error);
          failedCount++;
          results.push({ nome: prontuario.nome, codigoProntuario: prontuario.codigoProntuario, dataAgendamento: prontuario.dataAgendamento, tipoExame: prontuario.tipoExame, status: 'fail', error: result.error });
          this.logger.warn(`[${jobId}] ${prontuario.nome} FAILED: ${result.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`[${jobId}] ${prontuario.nome} EXCEPTION: ${errorMessage}`);
        try {
          await this.updateProgress(jobId, prontuario.codigoProntuario, 'failed', errorMessage);
        } catch {
          this.logger.error(`[${jobId}] Failed to update progress for ${prontuario.codigoProntuario}`);
        }
        failedCount++;
        results.push({ nome: prontuario.nome, codigoProntuario: prontuario.codigoProntuario, dataAgendamento: prontuario.dataAgendamento, tipoExame: prontuario.tipoExame, status: 'fail', error: errorMessage });
      }
    }

    // Gera relatório PDF com resumo dos resultados e adiciona ao ZIP
    if (results.length > 0) {
      try {
        const reportBuffer = await this.generateReportPdf(results, job.empresa.razaoSocial, tipo);
        archive.append(reportBuffer, { name: '_relatorio-exportacao.pdf' });
        this.logger.log(`[${jobId}] Report PDF generated (${results.length} items)`);
      } catch (error) {
        this.logger.error(`[${jobId}] Error generating report PDF: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Finaliza o archive SEMPRE (garante que o stream é fechado)
    try {
      await archive.finalize();
    } catch (error) {
      this.logger.error(`[${jobId}] Error finalizing ZIP: ${error instanceof Error ? error.message : String(error)}`);
      await this.finalizeJob(jobId, { status: 'failed', error: 'Erro ao finalizar ZIP' });
      return;
    }

    // Aguarda o upload stream completar
    try {
      await uploadPromise;
      this.logger.log(`[${jobId}] ZIP uploaded: ${blobName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${jobId}] Error uploading ZIP: ${errorMessage}`);
      await this.finalizeJob(jobId, { status: 'failed', error: `Erro ao fazer upload do ZIP: ${errorMessage}` });
      return;
    }

    const terminalStatus: GedBatchJobStatus = archiveError
      ? 'failed'
      : failedCount === 0
        ? 'completed'
        : succeededCount === 0
          ? 'failed'
          : 'partial';

    const finalError = archiveError ? `Stream error: ${archiveError}` : undefined;

    await this.finalizeJob(jobId, { blobName, status: terminalStatus, ...(finalError ? { error: finalError } : {}) });

    this.logger.log(`GED batch job ${jobId} finished | status=${terminalStatus} | ok=${succeededCount} | fail=${failedCount}`);
  }

  private async generateReportPdf(
    results: { nome: string; codigoProntuario: string; dataAgendamento?: string; tipoExame?: string; status: 'ok' | 'fail'; error?: string }[],
    empresaNome: string,
    tipo: GedBatchTipo,
  ): Promise<Buffer> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const ml = 40;
    const mr = 40;
    const contentWidth = pageWidth - ml - mr;

    const cols = {
      nome: 170,
      tipoExame: 100,
      data: 70,
      status: 50,
      obs: contentWidth - 170 - 100 - 70 - 50,
    };
    const rowH = 18;
    const headerBg = rgb(0.85, 0.85, 0.85);
    const borderColor = rgb(0.6, 0.6, 0.6);

    let page = doc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - 50;

    function drawHeader(d: PDFPage, yy: number) {
      d.drawText('Relatório de Exportação', { x: ml, y: yy, size: 14, font: fontBold });
      return yy - 22;
    }
    function drawInfo(d: PDFPage, yy: number) {
      d.drawText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { x: ml, y: yy, size: 9, font });
      d.drawText(`Empresa: ${empresaNome}  |  Tipo: ${tipo.toUpperCase()}`, { x: ml, y: yy - 14, size: 9, font });
      return yy - 36;
    }
    function drawSummary(d: PDFPage, yy: number, succ: number, fail: number) {
      const total = succ + fail;
      d.drawText(`Resumo: ${total} processados  |  ${succ} concluído(s)  |  ${fail} falha(s)`, {
        x: ml, y: yy, size: 10, font: fontBold,
      });
      return yy - 22;
    }

    function drawTableHeader(d: PDFPage, yy: number) {
      const x = ml;
      d.drawRectangle({ x, y: yy - rowH, width: contentWidth, height: rowH, color: headerBg });
      d.drawRectangle({ x, y: yy - rowH, width: contentWidth, height: rowH, borderColor, borderWidth: 0.5 });
      d.drawText('Nome', { x: x + 4, y: yy - 14, size: 9, font: fontBold });
      d.drawText('Tipo Exame', { x: x + cols.nome + 4, y: yy - 14, size: 9, font: fontBold });
      d.drawText('Data', { x: x + cols.nome + cols.tipoExame + 4, y: yy - 14, size: 9, font: fontBold });
      d.drawText('Status', { x: x + cols.nome + cols.tipoExame + cols.data + 4, y: yy - 14, size: 9, font: fontBold });
      d.drawText('Observação', { x: x + cols.nome + cols.tipoExame + cols.data + cols.status + 4, y: yy - 14, size: 9, font: fontBold });
      return yy - rowH;
    }

    function drawRow(d: PDFPage, yy: number, r: typeof results[0], idx: number) {
      const x = ml;
      const bg = idx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.95, 0.95, 0.97);
      d.drawRectangle({ x, y: yy - rowH, width: contentWidth, height: rowH, color: bg });
      d.drawRectangle({ x, y: yy - rowH, width: contentWidth, height: rowH, borderColor, borderWidth: 0.3 });

      const trunc = (s: string, max: number) => s.length > max ? s.slice(0, max - 1) + '\u2026' : s;

      d.drawText(trunc(r.nome, 24), { x: x + 4, y: yy - 13, size: 8, font });
      d.drawText(trunc(r.tipoExame || '-', 14), { x: x + cols.nome + 4, y: yy - 13, size: 8, font });
      d.drawText(r.dataAgendamento || '-', { x: x + cols.nome + cols.tipoExame + 4, y: yy - 13, size: 8, font });
      const statusLabel = r.status === 'ok' ? 'OK' : 'FALHA';
      const statusColor = r.status === 'ok' ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0);
      d.drawText(statusLabel, { x: x + cols.nome + cols.tipoExame + cols.data + 4, y: yy - 13, size: 8, font: fontBold, color: statusColor });
      const obs = r.error || '';
      d.drawText(trunc(obs, 30), { x: x + cols.nome + cols.tipoExame + cols.data + cols.status + 4, y: yy - 13, size: 7, font, color: rgb(0.4, 0.4, 0.4) });

      return yy - rowH;
    }

    // Render header
    y = drawHeader(page, y);
    y = drawInfo(page, y);

    const succ = results.filter((r) => r.status === 'ok').length;
    const fail = results.filter((r) => r.status === 'fail').length;

    y = drawSummary(page, y, succ, fail);
    y -= 4;
    y = drawTableHeader(page, y);

    for (let i = 0; i < results.length; i++) {
      if (y - rowH < 60) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - 50;
        y = drawTableHeader(page, y);
      }
      y = drawRow(page, y, results[i], i);
    }

    // Footer note on each page
    for (let pi = 0; pi < doc.getPageCount(); pi++) {
      const p = doc.getPage(pi);
      p.drawText('* Itens com status FALHA não tiveram documentos gerados no ZIP', {
        x: ml, y: 30, size: 7, font, color: rgb(0.5, 0.5, 0.5),
      });
      p.drawText(`Página ${pi + 1} de ${doc.getPageCount()}`, {
        x: pageWidth - mr - 80, y: 30, size: 7, font, color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }

  private async processWithConcurrency<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    concurrency: number,
  ): Promise<void> {
    let index = 0;

    const worker = async (): Promise<void> => {
      while (index < items.length) {
        const current = index++;
        await processor(items[current]);
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker(),
    );

    await Promise.all(workers);
  }

  private async processItemWithRetry(
    jobId: string,
    codigoProntuario: string,
    nome: string,
    tipo: GedBatchTipo,
    periodo?: { ano?: string; mes?: string },
  ): Promise<{ status: 'completed' | 'failed'; buffer?: Buffer; fileName?: string; error?: string }> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(`[${jobId}] Processing ${codigoProntuario} (${nome}) attempt ${attempt}/${this.maxRetries}`);

        if (tipo === 'aso') {
          return await this.processAso(codigoProntuario, periodo);
        }
        return await this.processProntuario(codigoProntuario, periodo);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[${jobId}] Attempt ${attempt}/${this.maxRetries} failed for ${codigoProntuario}: ${errorMessage}`);

        if (attempt === this.maxRetries) {
          return { status: 'failed', error: errorMessage };
        }
      }
    }

    return { status: 'failed', error: 'Falha apos todas as tentativas' };
  }

  private async processProntuario(
    codigoProntuario: string,
    periodo?: { ano?: string; mes?: string },
  ): Promise<{ status: 'completed' | 'failed'; buffer?: Buffer; fileName?: string; error?: string }> {
    const filter: Record<string, unknown> = {
      CODIGOPRONTUARIO: codigoProntuario,
    };

    if (periodo?.ano && periodo?.mes) {
      const startDate = new Date(`${periodo.ano}-${periodo.mes}-01`);
      const endMonth = Number(periodo.mes) === 12
        ? new Date(`${Number(periodo.ano) + 1}-01-01`)
        : new Date(`${periodo.ano}-${String(Number(periodo.mes) + 1).padStart(2, '0')}-01`);
      filter.DATAAGENDAMENTO_DATE = { $gte: startDate, $lt: endMonth };
    }

    const docs = await this.schedulingsCollection
      .find(filter)
      .sort({ DATAAGENDAMENTO: -1 })
      .toArray();

    if (!docs.length) {
      return { status: 'failed', error: 'Documento nao encontrado' };
    }

    const buffers: Buffer[] = [];

    for (const doc of docs) {
      if (doc.EXAMES && Array.isArray(doc.EXAMES)) {
        for (const exame of doc.EXAMES) {
          if (exame.url) {
            try {
              const buf = await this.downloadPdfBuffer(exame.url);
              buffers.push(buf);
            } catch {
              this.logger.warn(`[${codigoProntuario}] Failed to download exam: ${exame.url}`);
            }
          }
        }
      }

      if (doc.ANEXOS && Array.isArray(doc.ANEXOS)) {
        for (const anexo of doc.ANEXOS) {
          if (anexo.StoragePath && String(anexo.StoragePath).endsWith('.pdf')) {
            try {
              const buf = await this.downloadPdfBuffer(anexo.StoragePath);
              buffers.push(buf);
            } catch {
              this.logger.warn(`[${codigoProntuario}] Failed to download attachment: ${anexo.StoragePath}`);
            }
          }
        }
      }

      if (doc.ASOINFO?.url) {
        try {
          const buf = await this.downloadPdfBuffer(doc.ASOINFO.url);
          buffers.push(buf);
        } catch {
          this.logger.warn(`[${codigoProntuario}] Failed to download ASO: ${doc.ASOINFO.url}`);
        }
      }
    }

    if (!buffers.length) {
      const firstDoc = docs[0];
      this.logger.log(
        `[processProntuario][${codigoProntuario}] Nenhum arquivo encontrado no Mongo/Azure, tentando SOC WebServices...`,
      );
      const fromSOC = await this.downloadViaSOC('prontuario', codigoProntuario, firstDoc);
      if (fromSOC.status === 'completed' && fromSOC.buffer) {
        this.logger.log(
          `[processProntuario][${codigoProntuario}] SOC fallback OK (${fromSOC.buffer.length} bytes)`,
        );
        return fromSOC;
      }
      return { status: 'failed', error: `Nenhum exame com URL encontrado. Fallback SOC error: ${fromSOC.error || 'n/a'}` };
    }

    const mergedPdf = await mergePdfs(buffers);
    let fileName: string;
    try {
      fileName = this.buildProntuarioFileName(docs[0]);
    } catch {
      fileName = `PRONTUARIO_${codigoProntuario}.pdf`;
    }

    return { status: 'completed', buffer: mergedPdf, fileName };
  }

  private async processAso(
    codigoProntuario: string,
    periodo?: { ano?: string; mes?: string },
  ): Promise<{ status: 'completed' | 'failed'; buffer?: Buffer; fileName?: string; error?: string }> {
    const filter: Record<string, unknown> = {
      CODIGOPRONTUARIO: codigoProntuario,
    };

    if (periodo?.ano && periodo?.mes) {
      const startDate = new Date(`${periodo.ano}-${periodo.mes}-01`);
      const endMonth = Number(periodo.mes) === 12
        ? new Date(`${Number(periodo.ano) + 1}-01-01`)
        : new Date(`${periodo.ano}-${String(Number(periodo.mes) + 1).padStart(2, '0')}-01`);
      filter.DATAAGENDAMENTO_DATE = { $gte: startDate, $lt: endMonth };
    }

    this.logger.log(`[processAso][${codigoProntuario}] Buscando docs com filtro: ${JSON.stringify(filter)}`);
    const docs = await this.schedulingsCollection
      .find(filter)
      .sort({ DATAAGENDAMENTO: -1 })
      .toArray();

    this.logger.log(`[processAso][${codigoProntuario}] Encontrados ${docs.length} doc(s)`);
    if (!docs.length) {
      return { status: 'failed', error: 'Documento nao encontrado' };
    }

    // 1) Tenta via ASOINFO.url no MongoDB (fluxo atual)
    let asoUrlFound = false;
    for (const doc of docs) {
      if (doc.ASOINFO?.url) {
        asoUrlFound = true;
        this.logger.log(`[processAso][${codigoProntuario}] Tentando download via ASOINFO.url: ${doc.ASOINFO.url.substring(0, 120)}...`);
        try {
          const buffer = await this.downloadPdfBuffer(doc.ASOINFO.url);
          this.logger.log(`[processAso][${codigoProntuario}] Download via ASOINFO.url OK (${buffer.length} bytes)`);
          let fileName: string;
          try {
            fileName = this.buildAsoFileName(doc);
          } catch {
            fileName = `ASO_${codigoProntuario}.pdf`;
          }
          return { status: 'completed', buffer, fileName };
        } catch (dlErr) {
          const errMsg = dlErr instanceof Error ? dlErr.message : String(dlErr);
          this.logger.warn(`[processAso][${codigoProntuario}] ASO URL download FALHOU: ${errMsg} | URL: ${doc.ASOINFO.url}`);
        }
      }
    }

    // 2) Fallback: busca ASO diretamente no Azure por prefixo do path
    this.logger.log(
      `[processAso][${codigoProntuario}] ${asoUrlFound ? 'ASO download failed' : 'No ASOINFO.url found'}, trying Azure blob prefix search`,
    );
    const firstDoc = docs[0];
    const asoFromAzure = await this.findAsoByBlobPrefix(codigoProntuario, firstDoc, periodo);
    if (asoFromAzure) {
      this.logger.log(`[processAso][${codigoProntuario}] Fallback blob prefix OK`);
      return asoFromAzure;
    }

    // 3) Fallback final: SOC WebServices (via SOAP por sequencialFicha)
    this.logger.log(
      `[processAso][${codigoProntuario}] Azure blob fallback falhou, tentando SOC WebServices...`,
    );
    const fromSOC = await this.downloadViaSOC('aso', codigoProntuario, firstDoc);
    if (fromSOC.status === 'completed' && fromSOC.buffer) {
      this.logger.log(
        `[processAso][${codigoProntuario}] SOC fallback OK (${fromSOC.buffer.length} bytes)`,
      );
      return fromSOC;
    }

    this.logger.error(`[processAso][${codigoProntuario}] TODOS os métodos falharam. asoUrlFound=${asoUrlFound} socialError=${fromSOC.error || 'n/a'}`);
    return { status: 'failed', error: 'Nenhum ASO com URL encontrado' };
  }

  private async findAsoByBlobPrefix(
    codigoProntuario: string,
    doc: any,
    periodo?: { ano?: string; mes?: string },
  ): Promise<{ status: 'completed' | 'failed'; buffer?: Buffer; fileName?: string; error?: string } | null> {
    const prefixes: string[] = [];

    // Parse do codigoProntuario: {codEmpresa}-{cod}-{tipo}-{ddMMyyyy}
    const parts = codigoProntuario.split('-');
    const codEmpresa = parts[0] || '';
    const codFuncionario = parts[1] || '';
    const tipoExame = parts[2] || '';
    const dateStr = parts[3] || ''; // ddMMyyyy

    // Converter ddMMyyyy para YYYY-MM-DD para extrair ano/mes
    if (dateStr.length === 8) {
      const dd = dateStr.substring(0, 2);
      const mm = dateStr.substring(2, 4);
      const yyyy = dateStr.substring(4, 8);

      // 1) Prefixo moderno (Prioridade Máxima): aso/{ano}/{mes}/{empresa}/{codigoProntuario}/
      if (doc?.CODIGOEMPRESA) {
        const modernPrefix = `aso/${yyyy}/${mm}/${doc.CODIGOEMPRESA}/${codigoProntuario}/`;
        prefixes.push(modernPrefix);
      }

      // 2) Fallback moderno: aso/{ano}/{mes}/{empresa}/{codFuncionario}/
      if (doc?.CODIGOEMPRESA) {
        const fallbackPrefix = `aso/${yyyy}/${mm}/${doc.CODIGOEMPRESA}/${codFuncionario}/`;
        if (!prefixes.includes(fallbackPrefix)) {
          prefixes.push(fallbackPrefix);
        }
      }

      // 3) Prefixo legado (Último recurso): funcionarios/{ano}/{codEmpresa}-{cod}-{tipo}-{ddMMyyyy}/
      const legacyPrefix = `funcionarios/${yyyy}/${codEmpresa}-${codFuncionario}-${tipoExame}-${dateStr}/`;
      prefixes.push(legacyPrefix);
    }

    // Se tem período, também tenta o prefixo com ano/mês do período
    if (periodo?.ano && periodo?.mes && doc?.CODIGOEMPRESA) {
      const periodoPrefix = `aso/${periodo.ano}/${periodo.mes}/${doc.CODIGOEMPRESA}/${codigoProntuario}/`;
      if (!prefixes.includes(periodoPrefix)) {
        prefixes.push(periodoPrefix);
      }
      // Fallback período com codFuncionario
      const periodoFallbackPrefix = `aso/${periodo.ano}/${periodo.mes}/${doc.CODIGOEMPRESA}/${codFuncionario}/`;
      if (!prefixes.includes(periodoFallbackPrefix)) {
        prefixes.push(periodoFallbackPrefix);
      }
    }

    this.logger.log(`[${codigoProntuario}] findAsoByBlobPrefix prefixes: ${JSON.stringify(prefixes)}`);

    // Busca em cada prefixo nos containers: documents (primario) -> public -> documents (legado)
    for (const prefix of prefixes) {
      const searches: Array<{ label: string; client: ContainerClient | null; useFetch: boolean }> = [
        { label: 'documents (primary)', client: this.azureService.getContainerClientPublic(), useFetch: false },
        { label: 'public', client: this.azureService.getPublicContainerClient(), useFetch: true },
        { label: 'documents (legacy)', client: this.azureService.getLegacyContainerClient(), useFetch: false },
      ];

      for (const search of searches) {
        if (!search.client) continue;

        this.logger.log(`[${codigoProntuario}] Searching Azure (${search.label}): ${prefix}`);
        const blobs = await this.listBlobsByPrefix(prefix, search.client);

        if (blobs.length) {
          // Se for prefixo legado (funcionarios/), garantimos que só aceitamos arquivos que contenham 'aso' no nome
          const isLegacyPath = prefix.startsWith('funcionarios/');
          const filteredBlobs = isLegacyPath
            ? blobs.filter((b) => b.name.toLowerCase().includes('aso'))
            : blobs;

          if (!filteredBlobs.length) {
            this.logger.log(`[${codigoProntuario}] Blobs found in legacy prefix ${prefix} but none of them matched 'aso' filter. Skipping.`);
            continue;
          }

          // Ordena por lastModified (mais recente primeiro) e pega o primeiro
          const sorted = filteredBlobs
            .filter((b) => b.lastModified)
            .sort((a, b) => (b.lastModified!.getTime() - a.lastModified!.getTime()));

          const target = sorted.length ? sorted[0] : filteredBlobs[0];
          this.logger.log(`[${codigoProntuario}] Found blob (${search.label}): ${target.name}`);

          try {
            let buffer: Buffer;
            if (search.useFetch) {
              // Container publico: fetch direto (acesso publico de leitura)
              this.logger.log(`[${codigoProntuario}] [FETCH] Downloading from ${search.label}: ${target.url.substring(0, 100)}...`);
              const resp = await fetch(target.url, { signal: AbortSignal.timeout(30_000) });
              if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
              const ab = await resp.arrayBuffer();
              buffer = Buffer.from(ab);
              this.logger.log(`[${codigoProntuario}] [FETCH] OK from ${search.label} (${buffer.length} bytes)`);
            } else {
              this.logger.log(`[${codigoProntuario}] [SDK/SAS] Downloading from ${search.label}: ${target.url.substring(0, 100)}...`);
              buffer = await this.downloadPdfBuffer(target.url);
              this.logger.log(`[${codigoProntuario}] [SDK/SAS] OK from ${search.label} (${buffer.length} bytes)`);
            }
            let fileName: string;
            try {
              fileName = this.buildAsoFileName(doc);
            } catch {
              fileName = `ASO_${codigoProntuario}.pdf`;
            }
            return { status: 'completed', buffer, fileName };
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`[${codigoProntuario}] Failed to download from ${search.label}: ${errMsg}`);
          }
        }
      }
    }

    return null;
  }

  private async listBlobsByPrefix(
    prefix: string,
    containerClient: ContainerClient,
  ): Promise<Array<{ name: string; url: string; lastModified?: Date }>> {
    const results: Array<{ name: string; url: string; lastModified?: Date }> = [];
    try {
      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        if (blob.name.toLowerCase().endsWith('.pdf')) {
          const url = `${containerClient.url}/${encodeURI(blob.name)}`;
          results.push({ name: blob.name, url, lastModified: blob.properties.lastModified });
        }
      }
    } catch (error) {
      this.logger.debug(`[listBlobsByPrefix] Error listing prefix "${prefix}": ${error instanceof Error ? error.message : String(error)}`);
    }
    return results;
  }

  private async downloadPdfBuffer(urlOrPath: string): Promise<Buffer> {
    const shortUrl = urlOrPath.substring(0, 100);

    // 1) Tenta via SDK Azure (já com fallback automático para storage legado)
    try {
      this.logger.debug(`[downloadPdfBuffer][SDK] Tentando: ${shortUrl}...`);
      const buf = await this.azureService.downloadBlob(urlOrPath);
      this.logger.debug(`[downloadPdfBuffer][SDK] OK: ${shortUrl} (${buf.length} bytes)`);
      return buf;
    } catch (sdkErr) {
      const errMsg = sdkErr instanceof Error ? sdkErr.message : String(sdkErr);
      this.logger.debug(
        `[downloadPdfBuffer][SDK] FALHOU: ${shortUrl} — ${errMsg}`,
      );
    }

    // 2) Tenta via SAS URL (gera SAS com credencial correta — primária ou legada)
    try {
      this.logger.debug(`[downloadPdfBuffer][SAS] Tentando: ${shortUrl}...`);
      const sasUrl = this.azureService.generateSasUrlFromUrl(urlOrPath, 15);
      const response = await fetch(sasUrl, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} downloading ${urlOrPath}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      this.logger.debug(`[downloadPdfBuffer][SAS] OK: ${shortUrl} (${arrayBuffer.byteLength} bytes)`);
      return Buffer.from(arrayBuffer);
    } catch (sasErr) {
      const errMsg = sasErr instanceof Error ? sasErr.message : String(sasErr);
      this.logger.debug(
        `[downloadPdfBuffer][SAS] FALHOU: ${shortUrl} — ${errMsg}`,
      );
    }

    // 3) Último recurso: fetch direto da URL (caso blob seja público)
    try {
      this.logger.debug(`[downloadPdfBuffer][FETCH] Tentando: ${shortUrl}...`);
      const response = await fetch(urlOrPath, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} downloading ${urlOrPath}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      this.logger.debug(`[downloadPdfBuffer][FETCH] OK: ${shortUrl} (${arrayBuffer.byteLength} bytes)`);
      return Buffer.from(arrayBuffer);
    } catch (fetchErr) {
      const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      this.logger.error(`[downloadPdfBuffer][FETCH] FALHOU: ${shortUrl} — ${errMsg}`);
      throw new Error(`Todos os métodos de download falharam para ${shortUrl}`);
    }
  }

  /**
   * Tenta extrair PDFs de um buffer ZIP e mergear em um único PDF.
   * Permite filtrar os arquivos por nome (ex: apenas arquivos que contenham 'aso').
   */
  private async extractPdfFromZip(
    zipBuffer: Buffer,
    filterFn?: (fileName: string) => boolean,
  ): Promise<{ pdfBuffers: Buffer[]; fileNames: string[] }> {
    const pdfBuffers: Buffer[] = [];
    const fileNames: string[] = [];

    try {
      const directory = await unzipper.Open.buffer(Buffer.from(zipBuffer));
      
      // 1. Tenta filtrar os arquivos se um filtro foi fornecido
      let targetFiles = directory.files;
      if (filterFn) {
        const filtered = directory.files.filter((f) => f.path && filterFn(f.path));
        // Se encontrou arquivos com o filtro, usa eles. Se não, usa todos os PDFs (fallback)
        if (filtered.length > 0) {
          targetFiles = filtered;
        }
      }

      for (const file of targetFiles) {
        if (file.path && file.path.toLowerCase().endsWith('.pdf')) {
          const content = await file.buffer();
          pdfBuffers.push(Buffer.from(content));
          fileNames.push(file.path);
        }
      }
    } catch (err) {
      this.logger.error(`[extractPdfFromZip] Erro ao extrair ZIP: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { pdfBuffers, fileNames };
  }

  /**
   * Download de documento via WebServices da SOC usando sequencial da ficha (para prontuário)
   * ou busca por data e download por CD_GED (para ASO).
   * Fallback de última instância quando MongoDB e Azure Blob falham.
   */
  private async downloadViaSOC(
    tipo: GedBatchTipo,
    codigoProntuario: string,
    doc: any,
  ): Promise<{ status: 'completed' | 'failed'; buffer?: Buffer; fileName?: string; error?: string }> {
    const codEmpresa = String(doc.CODIGOEMPRESA || '').trim();
    if (!codEmpresa) {
      this.logger.warn(
        `[downloadViaSOC][${tipo}][${codigoProntuario}] SOC fallback: CODIGOEMPRESA ausente no documento`,
      );
      return { status: 'failed', error: 'CODIGOEMPRESA ausente' };
    }

    let buffer: Buffer;
    let fileName: string;
    let archiveKind: 'zip' | 'rar' | 'pdf' | 'unknown' = 'unknown';
    let rawBuffer: ArrayBuffer;

    try {
      fileName = tipo === 'aso' ? this.buildAsoFileName(doc) : this.buildProntuarioFileName(doc);
    } catch {
      fileName = tipo === 'aso' ? `ASO_${codigoProntuario}.pdf` : `PRONTUARIO_${codigoProntuario}.pdf`;
    }

    if (tipo === 'prontuario') {
      const sequencialFicha = String(doc.SEQUENCIAFICHA || '').trim();
      const sequencialResultado = String(
        doc.EXAMES?.[0]?.sequencialResultadoExame || '',
      ).trim();

      if (!sequencialFicha) {
        this.logger.warn(
          `[downloadViaSOC][prontuario][${codigoProntuario}] SOC fallback: SEQUENCIAFICHA ausente no documento`,
        );
        return { status: 'failed', error: 'SEQUENCIAFICHA ausente' };
      }

      this.logger.log(
        `[downloadViaSOC][prontuario][${codigoProntuario}] SOC fallback: baixando via SOAP por sequencialFicha=${sequencialFicha} empresa=${codEmpresa}`,
      );

      try {
        const soapResult = await WsDownloadArquivoPorSequencialFicha(
          codEmpresa,
          sequencialFicha,
          sequencialResultado,
        );

        if (!soapResult.success) {
          this.logger.warn(
            `[downloadViaSOC][prontuario][${codigoProntuario}] SOC fallback: SOAP falhou status=${soapResult.status} contentLength=${soapResult.contentLength} msg=${soapResult.socMessage || 'n/a'}`,
          );
          return {
            status: 'failed',
            error: `SOAP download failed: ${soapResult.socMessage || `status=${soapResult.status}`}`,
          };
        }

        rawBuffer = soapResult.buffer;
        archiveKind = soapResult.archiveKind;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`[downloadViaSOC][prontuario][${codigoProntuario}] SOC fallback: erro durante download: ${errMsg}`);
        return { status: 'failed', error: errMsg };
      }
    } else {
      // tipo === 'aso'
      const targetFicha = String(doc.SEQUENCIAFICHA || '').trim();
      if (!targetFicha) {
        this.logger.warn(
          `[downloadViaSOC][aso][${codigoProntuario}] SOC fallback: SEQUENCIAFICHA ausente no documento`,
        );
        return { status: 'failed', error: 'SEQUENCIAFICHA ausente' };
      }

      this.logger.log(
        `[downloadViaSOC][aso][${codigoProntuario}] SOC fallback: Buscando GED para ASO por sequencialFicha=${targetFicha}...`,
      );

      try {
        const CODIGO_ASODIGITAL = process.env.SOC_CODIGO_SOCGED_ASODIGITAL || '41';
        const credentials = getSocExportLayoutCredentials('SOC_ED_SOCGED');
        const url = buildSocExportDataUrl({
          empresa: codEmpresa,
          ...credentials,
          tipoSaida: 'json',
          tipoBusca: '1',
          sequencialFicha: targetFicha,
          cpfFuncionario: '',
          filtraPorTipoSocged: 'true',
          codigoTipoSocged: CODIGO_ASODIGITAL,
          dataInicio: '',
          dataFim: '',
          dataEmissaoInicio: '',
          dataEmissaoFim: '',
        });

        const response = await fetch(url, {
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          throw new Error(`GED lookup HTTP error: ${response.status}`);
        }

        const responseBuff = await response.arrayBuffer();
        const responseDecode = new TextDecoder('iso-8859-1').decode(responseBuff);
        
        let gedRecords: any[];
        try {
          gedRecords = JSON.parse(responseDecode);
        } catch (e) {
          throw new Error(`Failed to parse GED lookup response: ${responseDecode.substring(0, 200)}`);
        }

        if (!Array.isArray(gedRecords) || gedRecords.length === 0) {
          this.logger.warn(`[downloadViaSOC][aso][${codigoProntuario}] Nenhum registro GED retornado para a ficha ${targetFicha}`);
          return { status: 'failed', error: 'Nenhum registro GED retornado para a ficha' };
        }

        const matchedGed = gedRecords[0];
        if (!matchedGed || !matchedGed.CD_GED) {
          this.logger.warn(`[downloadViaSOC][aso][${codigoProntuario}] GED sem CD_GED encontrado na ficha ${targetFicha}`);
          return { status: 'failed', error: 'GED correspondente sem CD_GED' };
        }

        const cdGed = String(matchedGed.CD_GED).trim();
        this.logger.log(`[downloadViaSOC][aso][${codigoProntuario}] GED encontrado: ${cdGed}. Baixando por CD_GED...`);

        const soapResult = await WsDownloadArquivo(codEmpresa, cdGed);
        if (!soapResult.success) {
          this.logger.warn(
            `[downloadViaSOC][aso][${codigoProntuario}] SOC fallback: SOAP falhou status=${soapResult.status} contentLength=${soapResult.contentLength} msg=${soapResult.socMessage || 'n/a'}`,
          );
          return {
            status: 'failed',
            error: `SOAP download failed: ${soapResult.socMessage || `status=${soapResult.status}`}`,
          };
        }

        rawBuffer = soapResult.buffer;
        archiveKind = soapResult.archiveKind;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`[downloadViaSOC][aso][${codigoProntuario}] Falha ao buscar/baixar GED por sequencial de ficha: ${errMsg}`);
        return { status: 'failed', error: errMsg };
      }
    }

    // Processamento do buffer retornado (ZIP ou PDF)
    try {
      if (archiveKind === 'zip') {
        // Extrai todos os PDFs do ZIP sem aplicar nenhum filtro de regex
        const { pdfBuffers, fileNames } = await this.extractPdfFromZip(
          Buffer.from(rawBuffer)
        );

        if (pdfBuffers.length === 0) {
          this.logger.warn(`[downloadViaSOC][${tipo}][${codigoProntuario}] SOC fallback: ZIP vazio ou sem PDFs`);
          return { status: 'failed', error: 'ZIP sem PDFs' };
        }

        this.logger.log(
          `[downloadViaSOC][${tipo}][${codigoProntuario}] SOC fallback: ZIP contém ${pdfBuffers.length} PDF(s): ${fileNames.join(', ')}`,
        );

        const merged = await mergePdfs(pdfBuffers);
        buffer = merged;
      } else if (archiveKind === 'pdf') {
        buffer = Buffer.from(rawBuffer);
      } else {
        // unknown - tenta como PDF direto
        this.logger.warn(
          `[downloadViaSOC][${tipo}][${codigoProntuario}] SOC fallback: archiveKind desconhecido (${archiveKind}), tratando como PDF`,
        );
        buffer = Buffer.from(rawBuffer);
      }

      return { status: 'completed', buffer, fileName };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[downloadViaSOC][${tipo}][${codigoProntuario}] SOC fallback post-processing error: ${errMsg}`);
      return { status: 'failed', error: errMsg };
    }
  }

  async finalizeJob(
    jobId: string,
    payload?: { blobName?: string; blobUrl?: string; status?: 'completed' | 'failed' | 'partial'; error?: string },
  ): Promise<GedBatchJob> {
    const job = await this.collection.findOne({ _id: jobId });
    if (!job) throw new NotFoundException('GED batch job not found');

    if (this.isTerminalStatus(job.status)) {
      this.logger.debug(
        `GED batch job ${jobId} already finalized as ${job.status}, ignoring`,
      );
      return this.toPublicJob(job);
    }

    const hasBlobResult = Boolean(payload?.blobName || payload?.blobUrl);
    const terminalStatus: GedBatchJobStatus = hasBlobResult
      ? job.failedFuncionarios === 0
        ? 'completed'
        : job.succeededFuncionarios === 0
          ? 'failed'
          : 'partial'
      : payload?.status === 'partial'
        ? 'partial'
        : 'failed';

    const update: Partial<GedBatchJobDocument> = {
      status: terminalStatus,
      updatedAt: new Date(),
    };

    if (hasBlobResult) {
      const resultBlobName =
        payload?.blobName || this.buildResultBlobName(job);
      const resultBlobUrl = this.azureService.generateSasUrlFromUrl(
        payload?.blobUrl || resultBlobName,
      );

      update.result = {
        zipBlobName: resultBlobName,
        zipUrl: resultBlobUrl,
      };
    }

    if (payload?.error) {
      update.errors = [
        ...(job.errors || []),
        {
          message: payload.error,
        },
      ];
    }

    await this.collection.updateOne({ _id: jobId }, { $set: update });

    const updatedJob = await this.collection.findOne({ _id: jobId });
    if (!updatedJob) throw new NotFoundException('GED batch job not found');

    this.emitGedBatchStatus(updatedJob);

    this.pushService.sendGedBatchUpdate(this.toPublicJob(updatedJob)).catch((err) => {
      this.logger.error(
        `GED batch job ${jobId}: falha ao enviar push: ${err instanceof Error ? err.message : String(err)}`,
      );
    });

    this.logger.log(`GED batch job ${jobId} finalized as ${terminalStatus}`);
    return this.toPublicJob(updatedJob);
  }

  // =========================================================================
  // ===============  CLEANUP  ================================================
  // =========================================================================

  async cleanupOldJobs(): Promise<{ deleted: number; blobsDeleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    const oldJobs = await this.collection
      .find({
        status: { $in: this.terminalStatuses },
        updatedAt: { $lt: cutoffDate },
      })
      .toArray();

    if (!oldJobs.length) {
      this.logger.debug(`Cleanup: no jobs older than ${this.retentionDays} days`);
      return { deleted: 0, blobsDeleted: 0 };
    }

    let blobsDeleted = 0;

    for (const job of oldJobs) {
      if (job.result?.zipBlobName) {
        try {
          await this.azureService.deleteBlob(this.containerName, job.result.zipBlobName);
          blobsDeleted++;
        } catch (error) {
          this.logger.warn(
            `Cleanup: failed to delete blob ${job.result.zipBlobName}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    const deleteResult = await this.collection.deleteMany({
      _id: { $in: oldJobs.map((j) => j._id) },
    });

    this.logger.log(
      `Cleanup: deleted ${deleteResult.deletedCount} jobs and ${blobsDeleted} blobs (retention=${this.retentionDays} days)`,
    );

    return { deleted: deleteResult.deletedCount, blobsDeleted };
  }
}
