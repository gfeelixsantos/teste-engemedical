import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { MongoService } from '../mongo/mongo.service';
import { SignatureStatus } from '../mongo/types/scheduling';
import { AzureService } from '../azure/azure.service';
import { resolveWorkerBaseUrl } from '../utils/worker-base-url.util';
import { AsoProcessingMessage } from '../azure/types/azure.types';
import { IUserInfo } from '../user/interfaces/user.interface';
import { MedicalOpinionRules } from '../core/MedicalOptionsRules';
import { isSocOrigin } from '../core/atendimento-auth-rules';
import { SchedulingDocument } from '../mongo/types/scheduling';

type AsoResultDto = {
  schedulingId: string;
  commandId?: string;
  status: SignatureStatus;
  url?: string;
  validacao?: string;
  signature?: import('src/mongo/types/scheduling').DocumentSignatureInfo;
  updatedAt?: Date | string;
  emailSent?: boolean;
};

type ExamSignatureUpdatedDto = {
  schedulingId: string;
  grupoExame: string;
  signature: import('src/mongo/types/scheduling').DocumentSignatureInfo;

  url?: string;
  commandId?: string;
};

type ExamResultUpdatedDto = {
  schedulingId: string;
  examCodes: string[];
  url: string;
  source?: string;
  commandId?: string;
};

type ExamAnexosUpdatedDto = {
  schedulingId: string;
  anexos: any[];
  source?: string;
  commandId?: string;
};

type SignaturePendingQueryDto = {
  limit?: number;
  schedulingId?: string;
  commandId?: string;
};

type SignaturePendingItemDto = {
  schedulingId: string;
  grupoExame: string;
  codigoProfissional: string;
  url: string;
  signature: import('src/mongo/types/scheduling').DocumentSignatureInfo;
};

type CallbackEnvelope<T> = {
  schemaVersion?: string;
  eventType?: string;
  producer?: string;
  producedAt?: string | Date;
  schedulingId?: string;
  commandId?: string;
  payload?: T;
};

@Controller('internal')
export class InternalController {
  private readonly logger = new Logger(InternalController.name);

  constructor(
    private readonly mongoService: MongoService,
    private readonly azureService: AzureService,
  ) {}

  private assertInternalAuth(token?: string) {
    const expected = process.env.INTERNAL_WORKER_TOKEN;
    if (!expected) {
      throw new UnauthorizedException('INTERNAL_WORKER_TOKEN nao configurado');
    }
    if (!token || token !== expected) {
      throw new UnauthorizedException('Token interno invalido');
    }
  }

  private normalizeBody<
    T extends { schedulingId?: string; commandId?: string },
  >(body: T | CallbackEnvelope<T>): T {
    const envelope = body as CallbackEnvelope<T>;
    const payload = envelope?.payload;

    if (payload && typeof payload === 'object') {
      return {
        ...payload,
        schedulingId:
          payload.schedulingId ||
          envelope.schedulingId ||
          (body as any)?.schedulingId,
        commandId:
          payload.commandId || envelope.commandId || (body as any)?.commandId,
      } as T;
    }

    return body as T;
  }

  private buildAsoRequeuePayload(doc: any): AsoProcessingMessage {
    const normalizeGroup = (value: unknown) =>
      String(value || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const clinicalExam = Array.isArray(doc?.EXAMES)
      ? doc.EXAMES.find(
          (exam: any) => normalizeGroup(exam?.grupo).includes('clin'),
        )
      : undefined;
    const clinicalForm = clinicalExam?.formulario || {};
    const professional =
      doc?.ASOINFO?.professional && typeof doc.ASOINFO.professional === 'object'
        ? doc.ASOINFO.professional
        : undefined;
    const professionalCode = String(
      clinicalForm?.codigoMedico ||
        clinicalForm?.codigoProfissional ||
        clinicalExam?.codigoProfissional ||
      professional?.codigo ||
        doc?.ASOINFO?.codigoProfissional ||
        doc?.MEDICO ||
        '',
    ).trim();
    const payload: AsoProcessingMessage = {
      schedulingId: String(doc?._id || ''),
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
        ? doc.ASOINFO.observacoesParecer
        : [],
      action: 'REPROCESSAR',
      createdAt: new Date(),
      medico: professionalCode,
      prontuario: String(doc?.CODIGOPRONTUARIO || ''),
      socgedCode: '',
      ...(professional ? { profissional: professional } : {}),
      ...(doc?.ASOINFO?.credentials
        ? { credentials: doc.ASOINFO.credentials }
        : {}),
    };

    const missing = [
      ['schedulingId', payload.schedulingId],
      ['sequencial', payload.sequencial],
      ['codEmpresa', payload.codEmpresa],
      ['codFuncionario', payload.codFuncionario],
      ['medico', payload.medico],
    ]
      .filter(([, value]) => !String(value || '').trim())
      .map(([field]) => field);

    if (missing.length > 0) {
      throw new Error(
        `Payload de requeue ASO incompleto; campos ausentes: ${missing.join(', ')}`,
      );
    }

    return payload;
  }

  private isAsoEligibleForRequeue(doc: any): boolean {
    return this.getAsoRequeueEligibilityError(doc) === null;
  }

  private getAsoRequeueEligibilityError(doc: any): string | null {
    return MedicalOpinionRules.getAsoEligibilityReason(
      {
        opinionType: String(doc?.PARECERMEDICO || '').trim().toUpperCase() as any,
        details: String(doc?.RECOMENDACAOMEDICA || ''),
      },
      doc,
    );
  }

  private extractEnvelopeMeta<T>(body: T | CallbackEnvelope<T>) {
    const envelope = body as CallbackEnvelope<T>;
    return {
      schemaVersion: envelope?.schemaVersion,
      eventType: envelope?.eventType,
      producer: envelope?.producer,
      producedAt: envelope?.producedAt,
    };
  }

  @Get('aso/:id/status')
  async getAsoStatus(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
  ) {
    this.assertInternalAuth(token);

    const scheduling = await this.mongoService.schedulingsCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { ASOINFO: 1, ASOSTATUS: 1, ATENDIMENTOSTATUS: 1 } },
    );

    if (!scheduling) {
      throw new NotFoundException(`Agendamento ${id} não encontrado`);
    }

    return {
      schedulingId: id,
      ASOINFO: (scheduling as any).ASOINFO ?? null,
      ASOSTATUS: (scheduling as any).ASOSTATUS ?? null,
      ATENDIMENTOSTATUS: (scheduling as any).ATENDIMENTOSTATUS ?? null,
    };
  }

  @Post('aso/result')
  @HttpCode(204)
  async handleAsoResult(
    @Headers('x-internal-token') token: string | undefined,
    @Body() rawBody: AsoResultDto | CallbackEnvelope<AsoResultDto>,
  ) {
    const start = Date.now();
    const body = this.normalizeBody(rawBody);
    const meta = this.extractEnvelopeMeta(rawBody);

    this.assertInternalAuth(token);
    if (!body?.schedulingId)
      throw new BadRequestException('schedulingId obrigatorio');
    if (!body?.status) throw new BadRequestException('status obrigatorio');

    this.logger.log(
      `[CALLBACK][ASO][IN] schedulingId=${body.schedulingId} commandId=${body.commandId ?? 'n/a'} status=${body.status} eventType=${meta.eventType ?? 'n/a'} producer=${meta.producer ?? 'unknown'} schema=${meta.schemaVersion ?? 'n/a'}`,
    );

    try {
      await this.mongoService.applyAsoResultFromWorker(body);
      this.logger.log(
        `[CALLBACK][ASO][OUT] schedulingId=${body.schedulingId} commandId=${body.commandId ?? 'n/a'} status=${body.status} durationMs=${Date.now() - start}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[CALLBACK][ASO][ERR] schedulingId=${body.schedulingId} commandId=${body.commandId ?? 'n/a'} durationMs=${Date.now() - start} msg=${error?.message ?? error}`,
        error?.stack,
      );
      if (error?.message?.includes('nao encontrado')) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }

    return;
  }

  /**
   * Recebido quando o worker assina digitalmente um ASO que já havia sido
   * entregue como DIGITALIZADA (sem assinatura). Atualiza a URL e reenvia
   * o e-mail ao cliente com o ASO assinado.
   */
  @Post('aso/signed-after-delivery')
  @HttpCode(204)
  async handleAsoSignedAfterDelivery(
    @Headers('x-internal-token') token: string | undefined,
    @Body() body: { schedulingId: string; url: string; commandId?: string },
  ) {
    const start = Date.now();
    this.assertInternalAuth(token);

    if (!body?.schedulingId)
      throw new BadRequestException('schedulingId obrigatorio');
    if (!body?.url) throw new BadRequestException('url obrigatorio');

    this.logger.log(
      `[CALLBACK][ASO_SIGNED_LATE][IN] schedulingId=${body.schedulingId} commandId=${body.commandId ?? 'n/a'}`,
    );

    try {
      await this.mongoService.applyAsoSignedAfterDelivery(body);
      this.logger.log(
        `[CALLBACK][ASO_SIGNED_LATE][OUT] schedulingId=${body.schedulingId} durationMs=${Date.now() - start}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[CALLBACK][ASO_SIGNED_LATE][ERR] schedulingId=${body.schedulingId} durationMs=${Date.now() - start} msg=${error?.message ?? error}`,
        error?.stack,
      );
      throw error;
    }

    return;
  }

  @Post('signature/exam-updated')
  @HttpCode(204)
  async examSignatureUpdated(
    @Headers('x-internal-token') token: string | undefined,
    @Body()
    rawBody:
      | ExamSignatureUpdatedDto
      | CallbackEnvelope<ExamSignatureUpdatedDto>,
  ) {
    const start = Date.now();
    const body = this.normalizeBody(rawBody);
    const meta = this.extractEnvelopeMeta(rawBody);

    this.assertInternalAuth(token);
    if (!body?.schedulingId)
      throw new BadRequestException('schedulingId obrigatorio');
    if (!body?.grupoExame)
      throw new BadRequestException('grupoExame obrigatorio');
    if (!body?.signature)
      throw new BadRequestException('signature obrigatorio');

    this.logger.log(
      `[CALLBACK][EXAM_SIGNATURE][IN] schedulingId=${body.schedulingId} commandId=${body.commandId ?? 'n/a'} grupoExame=${body.grupoExame} eventType=${meta.eventType ?? 'n/a'} producer=${meta.producer ?? 'unknown'} schema=${meta.schemaVersion ?? 'n/a'}`,
    );

    try {
      await this.mongoService.applyExamSignatureUpdateFromWorker(body);
      this.logger.log(
        `[CALLBACK][EXAM_SIGNATURE][OUT] schedulingId=${body.schedulingId} commandId=${body.commandId ?? 'n/a'} grupoExame=${body.grupoExame} durationMs=${Date.now() - start}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[CALLBACK][EXAM_SIGNATURE][ERR] schedulingId=${body.schedulingId} commandId=${body.commandId ?? 'n/a'} grupoExame=${body.grupoExame} durationMs=${Date.now() - start} msg=${error?.message ?? error}`,
        error?.stack,
      );
      throw error;
    }

    return;
  }

  @Post('exam/result-updated')
  @HttpCode(204)
  async examResultUpdated(
    @Headers('x-internal-token') token: string | undefined,
    @Body()
    rawBody: ExamResultUpdatedDto | CallbackEnvelope<ExamResultUpdatedDto>,
  ) {
    const start = Date.now();
    const body = this.normalizeBody(rawBody);
    const meta = this.extractEnvelopeMeta(rawBody);

    this.assertInternalAuth(token);
    if (!body?.schedulingId)
      throw new BadRequestException('schedulingId obrigatorio');
    if (!body?.examCodes?.length)
      throw new BadRequestException('examCodes obrigatorio');
    if (!body?.url) throw new BadRequestException('url obrigatorio');

    this.logger.log(
      `[CALLBACK][EXAM_RESULT][IN] schedulingId=${body.schedulingId} commandId=${body.commandId ?? 'n/a'} examCodes=${body.examCodes.join(',')} url=${body.url} source=${body.source ?? 'n/a'} eventType=${meta.eventType ?? 'n/a'} producer=${meta.producer ?? 'unknown'} schema=${meta.schemaVersion ?? 'n/a'}`,
    );

    try {
      await this.mongoService.applyExamResultFromWorker(body);
      this.logger.log(
        `[CALLBACK][EXAM_RESULT][OUT] schedulingId=${body.schedulingId} commandId=${body.commandId ?? 'n/a'} examCodes=${body.examCodes.join(',')} durationMs=${Date.now() - start}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[CALLBACK][EXAM_RESULT][ERR] schedulingId=${body.schedulingId} commandId=${body.commandId ?? 'n/a'} examCodes=${body.examCodes.join(',')} durationMs=${Date.now() - start} msg=${error?.message ?? error}`,
        error?.stack,
      );
      throw error;
    }

    return;
  }

  @Post('exam/anexos-updated')
  @HttpCode(204)
  async examAnexosUpdated(
    @Headers('x-internal-token') token: string | undefined,
    @Body()
    rawBody: ExamAnexosUpdatedDto | CallbackEnvelope<ExamAnexosUpdatedDto>,
  ) {
    const start = Date.now();
    const body = this.normalizeBody(rawBody);
    const meta = this.extractEnvelopeMeta(rawBody);

    this.assertInternalAuth(token);
    if (!body?.schedulingId)
      throw new BadRequestException('schedulingId obrigatorio');
    if (!Array.isArray(body?.anexos))
      throw new BadRequestException('anexos obrigatorio');

    this.logger.log(
      `[CALLBACK][EXAM_ANEXOS][IN] schedulingId=${body.schedulingId} commandId=${body.commandId ?? 'n/a'} anexos=${body.anexos.length} source=${body.source ?? 'n/a'} eventType=${meta.eventType ?? 'n/a'} producer=${meta.producer ?? 'unknown'} schema=${meta.schemaVersion ?? 'n/a'}`,
    );

    try {
      await this.mongoService.applyExamAnexosUpdateFromWorker(body);
      this.logger.log(
        `[CALLBACK][EXAM_ANEXOS][OUT] schedulingId=${body.schedulingId} commandId=${body.commandId ?? 'n/a'} anexos=${body.anexos.length} durationMs=${Date.now() - start}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[CALLBACK][EXAM_ANEXOS][ERR] schedulingId=${body.schedulingId} commandId=${body.commandId ?? 'n/a'} anexos=${body.anexos.length} durationMs=${Date.now() - start} msg=${error?.message ?? error}`,
        error?.stack,
      );
      throw error;
    }

    return;
  }

  @Post('signature/pending')
  @HttpCode(200)
  async signaturePending(
    @Headers('x-internal-token') token: string | undefined,
    @Body()
    rawBody:
      | SignaturePendingQueryDto
      | CallbackEnvelope<SignaturePendingQueryDto>,
  ) {
    const start = Date.now();
    const body = this.normalizeBody(rawBody);
    const meta = this.extractEnvelopeMeta(rawBody);

    this.assertInternalAuth(token);

    const limit = Math.min(Math.max(Number(body?.limit || 50), 1), 200);
    this.logger.log(
      `[CALLBACK][SIGNATURE_PENDING][IN] limit=${limit} eventType=${meta.eventType ?? 'n/a'} producer=${meta.producer ?? 'unknown'} schema=${meta.schemaVersion ?? 'n/a'}`,
    );

    const pendingDocs =
      await this.mongoService.getPendingSignatureItemsFromBackend(limit);

    const items: SignaturePendingItemDto[] = pendingDocs.map((doc) => ({
      schedulingId: doc.schedulingId,
      grupoExame: doc.grupoExame,
      codigoProfissional: doc.codigoProfissional,
      url: doc.url,
      signature: doc.signature,
    }));

    this.logger.log(
      `[CALLBACK][SIGNATURE_PENDING][OUT] limit=${limit} total=${items.length} durationMs=${Date.now() - start}`,
    );

    return {
      schemaVersion: '1.0',
      eventType: 'SIGNATURE_PENDING_LIST',
      producer: 'engemedical-connect-backend',
      producedAt: new Date().toISOString(),
      payload: {
        items,
        total: items.length,
      },
    };
  }


  @Post('aso/requeue')
  @HttpCode(200)
  async requeueAso(
    @Headers('x-internal-token') token: string | undefined,
    @Body() body: { schedulingIds?: string[] },
  ) {
    this.assertInternalAuth(token);

    const filter = body?.schedulingIds?.length
      ? {
          _id: {
            $in: body.schedulingIds.map(
              (id) => new (require('mongodb').ObjectId)(id),
            ),
          },
        }
      : { 'ASOINFO.status': { $in: ['GERADO', 'PENDENTE', 'DIGITALIZADA'] } };

    const cursor = this.mongoService.schedulingsCollection.find(filter);
    let enqueued = 0;
    const errors: string[] = [];

    for await (const doc of cursor) {
      try {
        if (!this.isAsoEligibleForRequeue(doc)) {
          throw new Error(
            `ASO nao elegivel para reprocessamento: ${this.getAsoRequeueEligibilityError(doc)}`,
          );
        }

        if (!isSocOrigin(doc as unknown as SchedulingDocument)) {
          this.logger.log(
            `[ASO_REQUEUE_SKIP] schedulingId=${doc._id} origem=${(doc as any).AUTENTICACAOATENDIMENTO?.metodo} — não enviado para engemedical-connect-aso-generate`,
          );
          continue;
        }

        // CAS: reseta processingQueuedAt e garante status PENDENTE antes de enfileirar
        // Isso evita duplicatas se a rota for chamada múltiplas vezes
        const resetResult =
          await this.mongoService.schedulingsCollection.findOneAndUpdate(
            {
              _id: new (require('mongodb').ObjectId)(doc._id),
              'ASOINFO.status': {
                $in: ['PENDENTE', 'GERADO', 'DIGITALIZADA'],
              },
            },
            {
              $set: {
                'ASOINFO.status': 'PENDENTE',
                'ASOINFO.processingQueuedAt': new Date(),
                'ASOINFO.updatedAt': new Date(),
              },
            },
            { returnDocument: 'after' },
          );

        if (!resetResult?.value) {
          this.logger.log(
            `[ASO_REQUEUE_SKIP] schedulingId=${doc._id} — CAS falhou, documento já reservado por outro processo`,
          );
          continue;
        }

        const payload = this.buildAsoRequeuePayload(
          resetResult.value as any,
        );
        await this.azureService.filaAsoProcessing(payload);
        enqueued++;
      } catch (err) {
        errors.push(
          `schedulingId=${doc._id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return {
      schemaVersion: '1.0',
      eventType: 'ASO_REQUEUE',
      producer: 'engemedical-connect-backend',
      producedAt: new Date().toISOString(),
      payload: { enqueued, errors },
    };
  }

  @Get('signature/pending/by-professional')
  @HttpCode(200)
  async getPendingByProfessional(
    @Headers('x-internal-token') token: string | undefined,
    @Query('professionalCode') professionalCode: string | undefined,
    @Query('limit') limitQuery: string | undefined,
  ) {
    this.assertInternalAuth(token);

    if (!professionalCode?.trim()) {
      throw new BadRequestException('professionalCode obrigatorio');
    }

    const limit = Math.min(Math.max(Number(limitQuery || 50), 1), 200);

    this.logger.log(
      `[SIGNATURE_PENDING_BY_PROF][IN] professionalCode=${professionalCode} limit=${limit}`,
    );

    const items = await this.mongoService.getPendingDocumentsByProfessional(
      professionalCode,
      limit,
    );

    this.logger.log(
      `[SIGNATURE_PENDING_BY_PROF][OUT] professionalCode=${professionalCode} total=${items.length}`,
    );

    return {
      schemaVersion: '1.0',
      eventType: 'SIGNATURE_PENDING_BY_PROFESSIONAL',
      producer: 'engemedical-connect-backend',
      producedAt: new Date().toISOString(),
      payload: {
        professionalCode,
        items,
        total: items.length,
      },
    };
  }

  @Post('auth/professional-login')
  @HttpCode(200)
  async handleProfessionalLogin(
    @Headers('x-internal-token') token: string | undefined,
    @Body() body: { professionalCode?: string; pscSessionActive?: boolean },
  ) {
    this.assertInternalAuth(token);

    const professionalCode = String(body?.professionalCode || '').trim();
    if (!professionalCode) {
      throw new BadRequestException('professionalCode obrigatorio');
    }

    this.logger.log(
      `[PSC_LOGIN][IN] professionalCode=${professionalCode} pscSessionActive=${body?.pscSessionActive ?? 'n/a'}`,
    );

    const items =
      await this.mongoService.getPendingDocumentsByProfessional(
        professionalCode,
      );

    if (items.length > 0) {
      let requeued = 0;
      for (const item of items) {
        try {
          const doc = await this.mongoService.schedulingsCollection.findOne(
            { _id: new (require('mongodb').ObjectId)(item.schedulingId) },
          );
          if (doc && this.isAsoEligibleForRequeue(doc)) {
            if (!isSocOrigin(doc as unknown as SchedulingDocument)) {
              this.logger.log(
                `[PSC_LOGIN_AUTO_SKIP] schedulingId=${item.schedulingId} origem=${(doc as any).AUTENTICACAOATENDIMENTO?.metodo} — não enviado para engemedical-connect-aso-generate`,
              );
              continue;
            }

            await this.azureService.filaAsoProcessing(
              this.buildAsoRequeuePayload(doc),
            );
            requeued++;
            this.logger.log(
              `[PSC_LOGIN_AUTO] ASO pendente re-enfileirado para assinatura: schedulingId=${item.schedulingId}`,
            );
          }
        } catch (err: any) {
          this.logger.warn(
            `[PSC_LOGIN_AUTO] Falha ao re-enfileirar ASO ${item.schedulingId}: ${err?.message ?? err}`,
          );
        }
      }
      this.logger.log(
        `[PSC_LOGIN_AUTO] ${requeued}/${items.length} ASO(s) re-enfileirado(s) apos login PSC de ${professionalCode}`,
      );
    }

    this.logger.log(
      `[PSC_LOGIN][OUT] professionalCode=${professionalCode} pendingCount=${items.length}`,
    );

    return {
      schemaVersion: '1.0',
      eventType: 'PROFESSIONAL_LOGIN_DETECTED',
      producer: 'engemedical-connect-backend',
      producedAt: new Date().toISOString(),
      payload: {
        professionalCode,
        pscSessionActive: body?.pscSessionActive ?? false,
        pendingCount: items.length,
        queued: items.length > 0,
      },
    };
  }

  @Get('health/workers')
  async healthCheck() {
    const workerUrl = resolveWorkerBaseUrl();

    let workerStatus: 'online' | 'offline' | 'degraded' = 'online';
    let workerLatencyMs = 0;
    try {
      const start = Date.now();
      const resp = await fetch(workerUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      workerLatencyMs = Date.now() - start;
      workerStatus = resp.status < 500 ? 'online' : 'degraded';
    } catch {
      workerStatus = 'offline';
    }

    let asoProcessingCount = 0;
    let enriquecimentoCount = 0;
    let enriquecimentoDlqCount = 0;
    try {
      const allStats = await this.azureService.getAllQueueStats();
      asoProcessingCount =
        allStats.find((q) => q.name === 'aso-processing')
          ?.approximateMessagesCount ?? 0;
      enriquecimentoCount =
        allStats.find((q) => q.name === 'aso-enriquecimento')
          ?.approximateMessagesCount ?? 0;
      enriquecimentoDlqCount =
        allStats.find((q) => q.name === 'aso-enriquecimento-falhas')
          ?.approximateMessagesCount ?? 0;
    } catch {}

    return {
      'engemedical-connectWorker': {
        status: workerStatus,
        url: workerUrl,
        latencyMs: workerLatencyMs,
      },
      asoProcessingQueue: { approximateMessagesCount: asoProcessingCount, dlqCount: 0 },
      asoEnriquecimentoQueue: { approximateMessagesCount: enriquecimentoCount, dlqCount: enriquecimentoDlqCount },
      timestamp: new Date().toISOString(),
    };
  }


}
