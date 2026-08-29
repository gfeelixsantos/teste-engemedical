import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MongoService } from 'src/mongo/mongo.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { AzureService } from 'src/azure/azure.service';
import { AsoEnriquecimentoMessage, AsoProcessingMessage } from 'src/azure/types/azure.types';
import { FuncionarioEntity } from 'src/mongo/model/FuncionarioEntity';
import { IUserInfo } from 'src/user/interfaces/user.interface';
import { isSocOrigin } from 'src/core/atendimento-auth-rules';
import { SchedulingDocument } from 'src/mongo/types/scheduling';
import { AsoWorkerOrchestratorService } from 'src/soc/services/aso-worker-orchestrator.service';

const MAX_SIGNATURE_RETRIES = Number(process.env.ASO_SIGNATURE_RETRY_MAX_RETRIES || 5);
const MAX_GENERAL_RETRIES = Number(process.env.ASO_GENERAL_RETRY_MAX_RETRIES || 7);

@Injectable()
export class AsoSignatureRetryCronService {
  private readonly logger = new Logger(AsoSignatureRetryCronService.name);
  private isProcessing = false;

  constructor(
    private readonly mongoService: MongoService,
    private readonly supabaseService: SupabaseService,
    private readonly azureService: AzureService,
    private readonly asoWorkerOrchestratorService: AsoWorkerOrchestratorService,
  ) {}

  private isEnabled(): boolean {
    return process.env.ASO_SIGNATURE_RETRY_ENABLED !== 'false';
  }

  private getBatchLimit(): number {
    return Math.min(Math.max(Number(process.env.ASO_SIGNATURE_RETRY_BATCH_LIMIT || 50), 1), 200);
  }

  @Cron(process.env.ASO_SIGNATURE_RETRY_CRON || '*/3 * * * *', {
    timeZone: 'America/Sao_Paulo',
  })
  async handleAsoRetries() {
    if (!this.isEnabled()) {
      this.logger.debug('ASO retry cron disabled by configuration.');
      return;
    }

    if (this.isProcessing) {
      this.logger.debug('Previous ASO retry batch still processing. Skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      if (!this.mongoService.schedulingsCollection) {
        this.logger.error('[ASO_RETRY] MongoService nao inicializado (schedulingsCollection indefinida).');
        return;
      }

      const now = new Date();
      const limit = this.getBatchLimit();
      const metrics = {
        generalTotal: 0, generalEnqueued: 0, generalWorker: 0, generalExhausted: 0,
        signatureTotal: 0, signatureEnqueued: 0, signatureBackoff: 0, signatureDigitalizada: 0,
        elevationTotal: 0, elevationEnqueued: 0, skippedQueued: 0, skippedNoCode: 0,
      };

      // 1. General failures — ASOs sem URL (status FALHA)
      const generalFailures = await this.findGeneralFailures(now, limit);
      metrics.generalTotal = generalFailures.length;
      for (const doc of generalFailures) {
        const result = await this.processGeneralRetry(doc);
        if (result === 'enqueued') metrics.generalEnqueued++;
        else if (result === 'worker') metrics.generalWorker++;
        else if (result === 'exhausted') metrics.generalExhausted++;
        else if (result === 'skipped_queued') metrics.skippedQueued++;
        else if (result === 'skipped_nocode') metrics.skippedNoCode++;
      }

      // 2. Signature retries — ASOs com URL e signature pendente
      const signaturePending = await this.findSignatureRetries(now, limit);
      metrics.signatureTotal = signaturePending.length;
      for (const doc of signaturePending) {
        const result = await this.processSignatureRetry(doc);
        if (result === 'enqueued') metrics.signatureEnqueued++;
        else if (result === 'backoff') metrics.signatureBackoff++;
        else if (result === 'digitalizada') metrics.signatureDigitalizada++;
        else if (result === 'skipped_queued') metrics.skippedQueued++;
        else if (result === 'skipped_nocode') metrics.skippedNoCode++;
      }

      // 3. DIGITALIZADA elevation — ASOs elegíveis para tentar assinatura digital
      const elevationCandidates = await this.findElevationCandidates(limit);
      metrics.elevationTotal = elevationCandidates.length;
      for (const doc of elevationCandidates) {
        const result = await this.processElevationRetry(doc);
        if (result === 'enqueued') metrics.elevationEnqueued++;
        else if (result === 'skipped_nocode') metrics.skippedNoCode++;
      }

      // Log estruturado
      const total = metrics.generalTotal + metrics.signatureTotal + metrics.elevationTotal;
      if (total > 0) {
        this.logger.log(
          `[ASO_RETRY] Batch: ${total} encontrados | ` +
          `Gerais: ${metrics.generalTotal} (SOC:${metrics.generalEnqueued} BIO/FA:${metrics.generalWorker} exhausted:${metrics.generalExhausted}) | ` +
          `Assinaturas: ${metrics.signatureTotal} (enq:${metrics.signatureEnqueued} backoff:${metrics.signatureBackoff} digitalizada:${metrics.signatureDigitalizada}) | ` +
          `Elevacao: ${metrics.elevationTotal} (enq:${metrics.elevationEnqueued}) | ` +
          `Pulados: ${metrics.skippedQueued} na fila, ${metrics.skippedNoCode} sem codigo`,
        );
      }
    } catch (error) {
      this.logger.error(`[ASO_RETRY] Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isProcessing = false;
    }
  }

  // ─── General failures (status FALHA, no URL) ─────────────────────

  private async findGeneralFailures(now: Date, limit: number) {
    return await this.mongoService.schedulingsCollection
      .find({
        'ASOINFO.status': 'FALHA',
        'ASOINFO.emailSent': { $ne: true },
        'ASOINFO.generalRetry.exhausted': { $ne: true },
        $or: [
          { 'ASOINFO.generalRetry': { $exists: false } },
          { 'ASOINFO.generalRetry': null },
          { 'ASOINFO.generalRetry.nextRetryAt': { $exists: false } },
          { 'ASOINFO.generalRetry.nextRetryAt': null },
          { 'ASOINFO.generalRetry.nextRetryAt': { $lte: now } },
        ],
      })
      .limit(limit)
      .toArray();
  }

  private async processGeneralRetry(doc: any): Promise<string> {
    const schedulingId = String(doc._id || '').trim();
    const asoInfo = doc.ASOINFO || {};
    const currentRetry = asoInfo.generalRetry || {};
    const retryCount = Number(currentRetry.count || 0) + 1;

    // Pula se já está na fila de processamento e foi enfileirado recentemente (menos de 30 minutos atrás)
    if (asoInfo.processingQueuedAt) {
      const queuedAt = new Date(asoInfo.processingQueuedAt);
      const diffMs = Date.now() - queuedAt.getTime();
      if (diffMs < 30 * 60 * 1000) {
        return 'skipped_queued';
      }
    }

    if (retryCount > MAX_GENERAL_RETRIES) {
      this.logger.warn(`[ASO_RETRY] Max general retries (${MAX_GENERAL_RETRIES}) para ASO ${schedulingId}. Exhausted. Enviando para DLQ.`);
      await this.mongoService.schedulingsCollection.updateOne(
        { _id: (doc as any)._id },
        { $set: { 'ASOINFO.generalRetry.exhausted': true, 'ASOINFO.generalRetry.exhaustedAt': new Date() } },
      );
      // Envia para fila de falhas para monitoramento no frontend
      try {
        const professionalCode = this.resolveProfessionalCode(doc);
        const dlqPayload: AsoProcessingMessage = {
          schedulingId,
          sequencial: String(doc?.SEQUENCIAFICHA || ''),
          nomeFuncionario: String(doc?.NOME || ''),
          nomeEmpresa: String(doc?.NOMEEMPRESA || ''),
          tipoExame: String(doc?.TIPOEXAME || ''),
          tipoExameNome: String(doc?.TIPOEXAMENOME || ''),
          dataFicha: String(doc?.DATAAGENDAMENTO || ''),
          codEmpresa: String(doc?.CODIGOEMPRESA || ''),
          codFuncionario: String(doc?.CODIGO || ''),
          cpfFuncionario: String(doc?.CPFFUNCIONARIO || ''),
          parecer: String(doc?.PARECERMEDICO || ''),
          observacoesParecer: Array.isArray(doc?.ASOINFO?.observacoesParecer) ? doc.ASOINFO.observacoesParecer : [],
          action: 'REPROCESSAR',
          createdAt: new Date(),
          medico: professionalCode,
          prontuario: String(doc?.CODIGOPRONTUARIO || ''),
          socgedCode: '',
          ...(doc?.ASOINFO?.professional ? { profissional: doc.ASOINFO.professional } : {}),
        };
        await this.azureService.filaAsoProcessingFalhas(dlqPayload);
        this.logger.warn(`[ASO_RETRY] ASO ${schedulingId} enviado para aso-processing-falhas após ${MAX_GENERAL_RETRIES} tentativas.`);
      } catch (dlqError) {
        this.logger.error(`[ASO_RETRY] Falha ao enviar ASO ${schedulingId} para DLQ: ${dlqError.message}`);
      }
      return 'exhausted';
    }

    const backoffMins = this.computeBackoffMinutes(retryCount);
    const nextRetryAt = new Date(Date.now() + backoffMins * 60 * 1000);

    if (isSocOrigin(doc as unknown as SchedulingDocument)) {
      // SOC → re-enfileira para aso-processing
      const professionalCode = this.resolveProfessionalCode(doc);
      const payload: AsoProcessingMessage = {
        schedulingId,
        sequencial: String(doc?.SEQUENCIAFICHA || ''),
        nomeFuncionario: String(doc?.NOME || ''),
        nomeEmpresa: String(doc?.NOMEEMPRESA || ''),
        tipoExame: String(doc?.TIPOEXAME || ''),
        tipoExameNome: String(doc?.TIPOEXAMENOME || ''),
        dataFicha: String(doc?.DATAAGENDAMENTO || ''),
        codEmpresa: String(doc?.CODIGOEMPRESA || ''),
        codFuncionario: String(doc?.CODIGO || ''),
        cpfFuncionario: String(doc?.CPFFUNCIONARIO || ''),
        parecer: String(doc?.PARECERMEDICO || ''),
        observacoesParecer: Array.isArray(doc?.ASOINFO?.observacoesParecer)
          ? doc.ASOINFO.observacoesParecer : [],
        action: 'REPROCESSAR',
        createdAt: new Date(),
        medico: professionalCode,
        prontuario: String(doc?.CODIGOPRONTUARIO || ''),
        socgedCode: '',
        ...(doc?.ALTURA_PARECER ? { alturaParecer: doc.ALTURA_PARECER } : {}),
        ...(doc?.CONFINADO_PARECER ? { confinadoParecer: doc.CONFINADO_PARECER } : {}),
        ...(doc?.ASOINFO?.professional ? { profissional: doc.ASOINFO.professional } : {}),
        ...(doc?.ASOINFO?.credentials ? { credentials: doc.ASOINFO.credentials } : {}),
      };

      const missing = ['schedulingId', 'codEmpresa', 'codFuncionario', 'medico']
        .filter(f => !String(payload[f as keyof AsoProcessingMessage] || '').trim());
      if (missing.length > 0) {
        this.logger.warn(`[ASO_RETRY] ASO ${schedulingId} payload SOC incompleto (${missing.join(',')}). Exhausted.`);
        await this.mongoService.schedulingsCollection.updateOne(
          { _id: (doc as any)._id },
          { $set: { 'ASOINFO.generalRetry.exhausted': true, 'ASOINFO.generalRetry.exhaustedAt': new Date(), 'ASOINFO.generalRetry.lastError': `Payload SOC incompleto: ${missing.join(',')}` } },
        );
        return 'exhausted';
      }

      await this.mongoService.schedulingsCollection.updateOne(
        { _id: (doc as any)._id },
        {
          $set: {
            'ASOINFO.generalRetry': {
              pending: true, count: retryCount, nextRetryAt, lastAttempt: new Date(),
            },
            'ASOINFO.updatedAt': new Date(),
          },
        },
      );

      await this.azureService.filaAsoProcessing(payload);
      this.logger.log(`[ASO_RETRY] ASO ${schedulingId} SOC re-enfileirado para geracao (tentativa ${retryCount}, proximo em ${backoffMins}min).`);
      return 'enqueued';
    }

    // BIO/FACIAL → tenta worker com payload armazenado
    const retryPayload = asoInfo.workerRetryPayload;
    if (!retryPayload) {
      this.logger.warn(`[ASO_RETRY] ASO ${schedulingId} BIO/FA sem workerRetryPayload. Exhausted.`);
      await this.mongoService.schedulingsCollection.updateOne(
        { _id: (doc as any)._id },
        { $set: { 'ASOINFO.generalRetry.exhausted': true, 'ASOINFO.generalRetry.exhaustedAt': new Date() } },
      );
      return 'exhausted';
    }

    try {
      const workerResult = await this.asoWorkerOrchestratorService.callWorker(retryPayload);

      if (workerResult && workerResult.url) {
        // Limpa retry payload e persiste ASO
        await this.mongoService.schedulingsCollection.updateOne(
          { _id: (doc as any)._id },
          {
            $set: {
              ASOSTATUS: 'GERADO',
              'ASOINFO.status': 'PENDENTE',
              'ASOINFO.url': workerResult.url,
              'ASOINFO.documentHash': workerResult.documentHash || '',
              'ASOINFO.signature.status': 'PENDENTE',
              'ASOINFO.workerUpdatedAt': new Date(),
              'ASOINFO.generalRetry': { pending: false, count: retryCount, lastAttempt: new Date(), resolvedAt: new Date() },
            },
            $unset: { 'ASOINFO.workerRetryPayload': '' },
          },
        );

        // Enfileira enrichment
        doc.ASOINFO.url = workerResult.url;
        doc.ASOSTATUS = 'GERADO';
        const enrichmentPayload = this.buildSimpleEnrichmentPayload(doc);
        if (enrichmentPayload) {
          await this.azureService.filaAsoEnriquecimento(enrichmentPayload);
          this.logger.log(`[ASO_RETRY] ASO ${schedulingId} BIO/FA gerado com sucesso via worker e enfileirado para enrichment.`);
        } else {
          this.logger.log(`[ASO_RETRY] ASO ${schedulingId} BIO/FA gerado com sucesso via worker (sem enrichment payload).`);
        }
        return 'worker';
      } else {
        throw new Error('Worker retornou resposta sem URL');
      }
    } catch (workerError) {
      this.logger.warn(`[ASO_RETRY] ASO ${schedulingId} BIO/FA worker falhou (tentativa ${retryCount}): ${workerError.message}`);
      await this.mongoService.schedulingsCollection.updateOne(
        { _id: (doc as any)._id },
        {
          $set: {
            'ASOINFO.generalRetry': {
              pending: true, count: retryCount, nextRetryAt, lastAttempt: new Date(),
              lastError: String(workerError.message).substring(0, 500),
            },
            'ASOINFO.updatedAt': new Date(),
          },
        },
      );
      return 'worker';
    }
  }

  // ─── Signature retries (signature.status PENDENTE/FALHA, has URL) ──

  private async findSignatureRetries(now: Date, limit: number) {
    return await this.mongoService.schedulingsCollection
      .find({
        'ASOINFO.signature.requiresSignature': true,
        'ASOINFO.signature.status': { $in: ['PENDENTE', 'FALHA'] },
        'ASOINFO.url': { $exists: true, $nin: [null, ''] },
        'ASOINFO.emailSent': { $ne: true },
        'ASOINFO.status': { $ne: 'LIBERADO' },
        'ASOINFO.generalRetry.exhausted': { $ne: true },
        $or: [
          { 'ASOINFO.signature.retry': { $exists: false } },
          { 'ASOINFO.signature.retry': null },
          { 'ASOINFO.signature.retry.nextRetryAt': { $exists: false } },
          { 'ASOINFO.signature.retry.nextRetryAt': null },
          { 'ASOINFO.signature.retry.nextRetryAt': { $lte: now } },
        ],
      })
      .limit(limit)
      .toArray();
  }

  private async processSignatureRetry(doc: any): Promise<string> {
    const schedulingId = String(doc._id || '').trim();
    const asoInfo = doc.ASOINFO || {};
    const currentRetry = asoInfo.signature?.retry || {};
    const retryCount = Number(currentRetry.count || 0) + 1;
    const asoUrl = String(asoInfo.url || '').trim();

    if (!asoUrl) {
      this.logger.warn(`[ASO_RETRY] ASO ${schedulingId} signature sem URL. Ignorando.`);
      return 'skipped_queued';
    }

    const clinicalDoctor = Array.isArray(doc?.EXAMES)
      ? new FuncionarioEntity(doc as any).getMedicoClinico()
      : null;
    const professionalCode = String(
      clinicalDoctor?.codigo || asoInfo?.codigoProfissional || doc?.MEDICO || '',
    ).trim();

    if (!professionalCode) {
      this.logger.warn(`[ASO_RETRY] ASO ${schedulingId} sem codigoProfissional. Exhausted.`);
      await this.mongoService.schedulingsCollection.updateOne(
        { _id: (doc as any)._id },
        { $set: { 'ASOINFO.generalRetry.exhausted': true, 'ASOINFO.generalRetry.exhaustedAt': new Date(), 'ASOINFO.generalRetry.lastError': 'Codigo profissional nao identificado' } },
      );
      return 'exhausted';
    }

    const hasSigningCapability = await this.checkProfessionalCapability(professionalCode);

    if (hasSigningCapability) {
      await this.enqueueForEnrichment(doc, professionalCode);
      this.logger.log(`[ASO_RETRY] ASO ${schedulingId} re-enfileirado para enrichment (profissional ${professionalCode} com sessao ativa).`);
      return 'enqueued';
    }

    if (retryCount > MAX_SIGNATURE_RETRIES) {
      this.logger.warn(`[ASO_RETRY] Max retries (${MAX_SIGNATURE_RETRIES}) para ASO ${schedulingId}. Liberando como DIGITALIZADA.`);
      await this.releaseAsDigitalizada(schedulingId, asoUrl);
      return 'digitalizada';
    }

    const backoffMins = this.computeBackoffMinutes(retryCount);
    const nextRetryAt = new Date(Date.now() + backoffMins * 60 * 1000);

    await this.mongoService.schedulingsCollection.updateOne(
      { _id: (doc as any)._id },
      {
        $set: {
          'ASOINFO.signature.retry': { pending: true, count: retryCount, nextRetryAt },
          'ASOINFO.signature.lastAttempt': new Date(),
          'ASOINFO.signature.error': 'Sessao PSC nao disponivel. Retry agendado.',
        },
      },
    );

    this.logger.log(`[ASO_RETRY] Backoff ASO ${schedulingId}: tentativa ${retryCount}, proximo em ${backoffMins}min.`);
    return 'backoff';
  }

  // ─── DIGITALIZADA elevation ───────────────────────────────────

  private async findElevationCandidates(limit: number) {
    return await this.mongoService.schedulingsCollection
      .find({
        'ASOINFO.status': 'DIGITALIZADA',
        'ASOINFO.url': { $exists: true, $ne: null },
        'ASOINFO.emailSent': { $ne: true },
        'ASOINFO.generalRetry.exhausted': { $ne: true },
        'ASOINFO.signature.status': { $nin: ['ASSINADO', 'LIBERADO', 'PROCESSANDO', 'PENDENTE'] },
      })
      .limit(limit)
      .toArray();
  }

  private async processElevationRetry(doc: any): Promise<string> {
    const schedulingId = String(doc._id || '').trim();
    const asoInfo = doc.ASOINFO || {};

    const clinicalDoctor = Array.isArray(doc?.EXAMES)
      ? new FuncionarioEntity(doc as any).getMedicoClinico()
      : null;
    const professionalCode = String(
      clinicalDoctor?.codigo || asoInfo?.codigoProfissional || doc?.MEDICO || '',
    ).trim();

    if (!professionalCode) {
      await this.mongoService.schedulingsCollection.updateOne(
        { _id: (doc as any)._id },
        { $set: { 'ASOINFO.generalRetry.exhausted': true, 'ASOINFO.generalRetry.exhaustedAt': new Date(), 'ASOINFO.generalRetry.lastError': 'Codigo profissional nao identificado' } },
      );
      return 'exhausted';
    }

    const hasSigningCapability = await this.checkProfessionalCapability(professionalCode);

    if (hasSigningCapability) {
      await this.enqueueForEnrichment(doc, professionalCode);
      this.logger.log(`[ASO_RETRY] ASO ${schedulingId} DIGITALIZADA elevado para enrichment (profissional ${professionalCode} com sessao ativa).`);
      return 'enqueued';
    }

    return 'skipped_nocode';
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private resolveProfessionalCode(doc: any): string {
    const clinicalExam = Array.isArray(doc?.EXAMES)
      ? doc.EXAMES.find((exam: any) =>
          String(exam?.grupo || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
            .includes('clin'),
        )
      : undefined;
    const clinicalForm = clinicalExam?.formulario || {};
    const professional =
      doc?.ASOINFO?.professional && typeof doc.ASOINFO.professional === 'object'
        ? doc.ASOINFO.professional
        : undefined;

    return String(
      clinicalForm?.codigoMedico ||
        clinicalForm?.codigoProfissional ||
        clinicalExam?.codigoProfissional ||
        professional?.codigo ||
        doc?.ASOINFO?.codigoProfissional ||
        doc?.MEDICO ||
        '',
    ).trim();
  }

  private async checkProfessionalCapability(professionalCode: string): Promise<boolean> {
    try {
      const settings = await this.supabaseService.getUserSettings(professionalCode);
      if (!settings || settings.assina_digitalmente !== true) {
        return false;
      }

      const provider = String(settings?.assinatura_provider || settings?.provider || '')
        .trim().toUpperCase();

      if (provider === 'BRYKMS') {
        const hasIdentity = !!settings?.uuid_cert || !!settings?.bry_cloud_user;
        const hasSecret = !!settings?.pin || !!settings?.bry_cloud_pin || !!settings?.token || !!settings?.bry_cloud_token;
        return hasIdentity && hasSecret;
      }

      const session = await this.supabaseService.getValidPscSession(professionalCode);
      return Boolean(session?.signature_session);
    } catch {
      return false;
    }
  }

  private async enqueueForEnrichment(doc: any, professionalCode: string) {
    const payload: AsoEnriquecimentoMessage = {
      schedulingId: String(doc._id || '').trim(),
      url: String(doc?.ASOINFO?.url || '').trim(),
      nomeFuncionario: String(doc?.NOME || '').trim(),
      nomeEmpresa: String(doc?.NOMEEMPRESA || '').trim(),
      tipoExame: String(doc?.TIPOEXAMENOME || doc?.TIPOEXAME || '').trim(),
      medico: professionalCode,
      codEmpresa: String(doc?.CODIGOEMPRESA || '').trim(),
      observacoesParecer: Array.isArray(doc?.ASOINFO?.observacoesParecer)
        ? doc.ASOINFO.observacoesParecer : [],
      createdAt: new Date(),
      credentials: doc?.ASOINFO?.credentials,
      profissional: this.normalizeUserInfo(doc?.ASOINFO?.professional, professionalCode),
    };

    if (!payload.schedulingId || !payload.url) {
      this.logger.warn(`[ASO_RETRY] Payload enrichment incompleto para ${payload.schedulingId}. Pulando.`);
      return;
    }

    await this.azureService.filaAsoEnriquecimento(payload);
  }

  private buildSimpleEnrichmentPayload(doc: any): AsoEnriquecimentoMessage | null {
    const schedulingId = String(doc?._id || '').trim();
    const url = String(doc?.ASOINFO?.url || '').trim();
    if (!schedulingId || !url) return null;

    return {
      schedulingId,
      url,
      nomeFuncionario: String(doc?.NOME || '').trim(),
      nomeEmpresa: String(doc?.NOMEEMPRESA || '').trim(),
      tipoExame: String(doc?.TIPOEXAMENOME || doc?.TIPOEXAME || '').trim(),
      medico: doc?.MEDICO || doc?.MEDICOCOORDENADOR || undefined,
      codEmpresa: String(doc?.CODIGOEMPRESA || '').trim(),
      createdAt: new Date(),
    };
  }

  private async releaseAsDigitalizada(schedulingId: string, asoUrl: string) {
    await this.mongoService.applyAsoResultFromWorker({
      schedulingId,
      status: 'LIBERADO',
      url: asoUrl,
      signature: {
        documentType: 'ASO',
        requiresSignature: true,
        status: 'ASSINATURA_IGNORADA',
        provider: 'DIGITALIZADA',
        liberadoComoDigitalizada: true,
        liberadoComoDigitalizadaEm: new Date(),
      } as any,
    });

    this.logger.log(`[ASO_RETRY] ASO ${schedulingId} liberado como DIGITALIZADA apos exaurir retentativas.`);
  }

  private computeBackoffMinutes(retryCount: number): number {
    switch (retryCount) {
      case 1: return 1;
      case 2: return 2;
      case 3: return 5;
      case 4: return 15;
      default: return 30;
    }
  }

  private normalizeUserInfo(candidate: any, fallbackCode?: string): IUserInfo | undefined {
    if (!candidate && !fallbackCode) return undefined;

    const codigo = String(
      candidate?.codigo || candidate?.code || candidate?.codigoProfissional || fallbackCode || '',
    ).trim();

    if (!codigo) return undefined;

    return {
      codigo,
      nome: String(candidate?.nome || candidate?.name || '').trim(),
      cpf: String(candidate?.cpf || '').trim(),
      perfil: String(candidate?.perfil || '').trim(),
      conselho: String(candidate?.conselho || candidate?.crm || candidate?.registro || '').trim(),
      ufconselho: String(candidate?.ufconselho || candidate?.uf || candidate?.crm_uf || '').trim(),
    };
  }
}
