import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MongoService } from 'src/mongo/mongo.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import {
  SchedulingDocument,
  SignatureStatus,
} from 'src/mongo/types/scheduling';
import { BryClientService } from 'src/signature/bry-client.service';
import { BlobServiceClient } from '@azure/storage-blob';
import axios from 'axios';

/** Número máximo de tentativas de assinatura PSC/BRYKMS antes de liberar como DIGITALIZADA */
const MAX_SIGNATURE_RETRIES = Number(
  process.env.ASO_MAX_SIGNATURE_RETRIES || 5,
);

/** URL base interna do backend */
function resolveBackendBaseUrl(): string {
  return String(
    process.env.BACKEND_INTERNAL_BASE_URL || process.env.BACKEND_BASE_URL || '',
  ).trim();
}

@Injectable()
export class SignatureRetryCronService {
  private readonly logger = new Logger(SignatureRetryCronService.name);
  private isProcessing = false; // Idempotency lock

  private isRetryEnabled(): boolean {
    return process.env.ENABLE_SIGNATURE_RETRY_CRON !== 'false';
  }

  constructor(
    private readonly mongoService: MongoService,
    private readonly supabaseService: SupabaseService,
    private readonly bryClientService: BryClientService,
  ) {}

  // Run every minute (can be adjusted via env or left as default)
  @Cron(process.env.SIGNATURE_RETRY_CRON || CronExpression.EVERY_MINUTE)
  async handleSignatureRetries() {
    if (!this.isRetryEnabled()) {
      this.logger.debug('Signature retry cron disabled by configuration.');
      return;
    }

    if (this.isProcessing) {
      this.logger.debug(
        'Previous signature retry batch is still processing. Skipping...',
      );
      return;
    }

    this.isProcessing = true;

    try {
      this.logger.log('Starting signature retry job...');
      const pendingDocs = await this.mongoService.findPendingSignatures();

      if (pendingDocs.length === 0) {
        this.logger.debug('No pending signatures found.');
      } else {
        this.logger.log(
          `Found ${pendingDocs.length} pending signatures. Processing...`,
        );
        for (const doc of pendingDocs) {
          await this.processPendingDocument(doc);
        }
      }
    } catch (error) {
      this.logger.error(`Error in signature retry cron: ${error.message}`);
    } finally {
      this.isProcessing = false;
      this.logger.debug('Signature retry job finished.');
    }
  }

  private async processPendingDocument(doc: SchedulingDocument) {
    for (const exame of doc.EXAMES) {
      if (!exame.signatureInfo) continue;

      const sigStatus = exame.signatureInfo.status;
      const isWaitingAuth =
        sigStatus === 'WAITING_AUTH' || sigStatus === 'AGUARDANDO_AUTENTICACAO';
      const isPendingRetry =
        sigStatus === 'PENDING_RETRY' ||
        sigStatus === 'AGUARDANDO_REPROCESSAMENTO' ||
        sigStatus === 'FALHA_ASSINATURA' ||
        sigStatus === 'FAILED' ||
        (sigStatus as string) === 'ERRO';

      if (!isWaitingAuth && !isPendingRetry) continue;

      // Respeitar nextRetryAt em qualquer status se existir
      if (exame.signatureInfo.nextRetryAt) {
        const nextRetryAt = new Date(exame.signatureInfo.nextRetryAt);
        if (nextRetryAt > new Date()) {
          continue;
        }
      }

      const userCodigo = exame.codigoProfissional;
      const grupo = exame.grupo ?? 'Grupo nao vinculado';

      if (!userCodigo || userCodigo.trim() === '') {
        await this.applyRetryBackoff(
          doc._id.toString(),
          grupo,
          exame.signatureInfo,
          exame.signatureInfo.provider || '',
          'Ausencia de codigoProfissional no exame. Impossivel assinar.',
        );
        continue;
      }

      const kmsType =
        exame.signatureInfo.kmsType === 'BRYKMS' ? 'BRYKMS' : 'PSC';

      if (kmsType === 'BRYKMS') {
        await this.processBryKmsExam(doc, exame, userCodigo);
      } else {
        await this.processPscExam(doc, exame, userCodigo, isPendingRetry);
      }
    }
  }

  private async processPscExam(
    doc: SchedulingDocument,
    exame: SchedulingDocument['EXAMES'][number],
    userCodigo: string,
    isPendingRetry: boolean,
  ) {
    const grupo = exame.grupo ?? 'Grupo nao vinculado';
    const sessionData =
      await this.supabaseService.getValidPscSession(userCodigo);

    if (!sessionData) {
      if (isPendingRetry) {
        await this.updateToWaitingAuth(
          doc._id.toString(),
          grupo,
          exame.signatureInfo,
          'PSC',
          'Sessao de usuario nao encontrada',
        );
      }
      return;
    }

    try {
      const urlToSign = exame.url;
      if (!urlToSign || typeof urlToSign !== 'string') {
        throw new Error(`Exame ${exame.grupo} sem URL valida para assinatura.`);
      }

      const pdfBuffer = await this.downloadBlobAsBuffer(urlToSign);
      const signedBuffer = await this.bryClientService.assinarPdfBry(
        pdfBuffer,
        sessionData.signature_session,
        sessionData.integra_url,
      );

      const signedUrl = await this.uploadSignedBuffer(signedBuffer, urlToSign);

      const wasPreviouslyReleasedAsDigitalizada =
        exame.signatureInfo?.liberadoComoDigitalizada === true;

      const successInfo = {
        ...exame.signatureInfo,
        status: 'ASSINADO' as SignatureStatus,
        provider: sessionData.psc_name || sessionData.provider || 'PSC',
        signedAt: new Date(),
        lastError: null,
        lastErrorCategory: null,
        nextRetryAt: null,
        liberadoComoDigitalizada: false, // limpa flag após assinatura
      };

      await this.mongoService.updateSignatureStatus(
        doc._id.toString(),
        grupo,
        successInfo,
        signedUrl,
      );

      // Se o ASO já havia sido entregue como DIGITALIZADA, notificar backend
      // para re-enviar email atualizado com o ASO assinado digitalmente
      if (wasPreviouslyReleasedAsDigitalizada) {
        this.logger.log(
          `[SIG_RETRY] ASO ${doc._id} assinado após entrega como DIGITALIZADA — notificando backend para email atualizado.`,
        );
        await this.notifyBackendAsoSignedAfterDelivery(
          doc._id.toString(),
          signedUrl,
        ).catch((e: any) =>
          this.logger.warn(
            `[SIG_RETRY] Falha ao notificar backend de assinatura tardia: ${e?.message}`,
          ),
        );
      }
    } catch (error: any) {
      const errorMsg = error.message || '';
      const isAuthError = this.isAuthOrCredentialError(error);
      const isConsumedError = this.isPscConsumedError(errorMsg);

      if (isAuthError || isConsumedError) {
        await this.supabaseService.invalidatePscSession(
          userCodigo,
          sessionData.signature_session,
          'Token consumido ou expirado pela API BRy no cron de retry',
        );

        await this.updateToWaitingAuth(
          doc._id.toString(),
          grupo,
          exame.signatureInfo,
          sessionData.psc_name || sessionData.provider || 'PSC',
          isConsumedError
            ? 'Sessao esgotada ou invalida. Reautentique-se.'
            : 'Sessao expirada durante retry',
        );
      } else {
        await this.applyRetryBackoff(
          doc._id.toString(),
          grupo,
          exame.signatureInfo,
          sessionData.psc_name || sessionData.provider || 'PSC',
          errorMsg,
        );
      }
    }
  }

  private async processBryKmsExam(
    doc: SchedulingDocument,
    exame: SchedulingDocument['EXAMES'][number],
    userCodigo: string,
  ) {
    const grupo = exame.grupo ?? 'Grupo nao vinculado';
    const userSettings =
      await this.supabaseService.getUserSettingsWithPin(userCodigo);
    const bryData = this.resolveBryKmsCredentials(userSettings);

    if (!bryData.hasIdentity || !bryData.hasSecret) {
      const reason = !bryData.hasIdentity
        ? 'Certificado BRYKMS nao configurado (uuid_cert/user).'
        : 'PIN/Token BRYKMS nao configurado.';

      await this.updateToWaitingAuth(
        doc._id.toString(),
        grupo,
        exame.signatureInfo,
        'BRYKMS',
        reason,
      );
      return;
    }

    try {
      const urlToSign = exame.url;
      if (!urlToSign || typeof urlToSign !== 'string') {
        throw new Error(`Exame ${exame.grupo} sem URL valida para assinatura.`);
      }

      const pdfBuffer = await this.downloadBlobAsBuffer(urlToSign);
      const signedBuffer = await this.bryClientService.signPdfWithKms({
        pdfBuffer,
        kmsType: 'BRYKMS',
        kmsData: bryData.kmsData,
      });

      const signedUrl = await this.uploadSignedBuffer(signedBuffer, urlToSign);

      const successInfo = {
        ...exame.signatureInfo,
        status: 'ASSINADO' as SignatureStatus,
        provider: 'BRYKMS',
        kmsType: 'BRYKMS',
        signedAt: new Date(),
        lastError: null,
        lastErrorCategory: null,
        nextRetryAt: null,
      };

      await this.mongoService.updateSignatureStatus(
        doc._id.toString(),
        grupo,
        successInfo,
        signedUrl,
      );
    } catch (error: any) {
      const errorMsg = error.message || '';
      const isAuthError = this.isAuthOrCredentialError(error);

      if (isAuthError) {
        await this.updateToWaitingAuth(
          doc._id.toString(),
          grupo,
          exame.signatureInfo,
          'BRYKMS',
          errorMsg || 'Falha de autenticacao BRYKMS. Reautentique-se.',
        );
      } else {
        await this.applyRetryBackoff(
          doc._id.toString(),
          grupo,
          exame.signatureInfo,
          'BRYKMS',
          errorMsg || 'Falha na assinatura BRYKMS',
        );
      }
    }
  }

  private isAuthOrCredentialError(error: any): boolean {
    const errorMsg = (error?.message || '').toLowerCase();
    const status = Number(error?.status);

    if (status === 401 || status === 403) {
      return true;
    }

    return (
      errorMsg.includes('unauthorized') ||
      errorMsg.includes('forbidden') ||
      errorMsg.includes('invalid credentials') ||
      errorMsg.includes('credenciais') ||
      errorMsg.includes('pin invalido') ||
      errorMsg.includes('invalid pin') ||
      errorMsg.includes('usuario invalido') ||
      errorMsg.includes('user invalid')
    );
  }

  private resolveBryKmsCredentials(userSettings: any) {
    const uuidCert = userSettings?.uuid_cert || null;
    const user = userSettings?.bry_cloud_user || null;
    const rawPin = userSettings?.pin || userSettings?.bry_cloud_pin || null;
    const token = userSettings?.token || userSettings?.bry_cloud_token || null;

    const normalizedPin = rawPin ? this.normalizePinToBase64(rawPin) : null;

    return {
      hasIdentity: !!uuidCert || !!user,
      hasSecret: !!normalizedPin || !!token,
      kmsData: {
        ...(uuidCert ? { uuid_cert: uuidCert } : {}),
        ...(user ? { user } : {}),
        ...(normalizedPin ? { pin: normalizedPin } : {}),
        ...(token ? { token } : {}),
      },
    };
  }

  private normalizePinToBase64(pinValue: string): string {
    const value = String(pinValue).trim();
    if (!value) return value;

    const seemsBase64 =
      value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);

    if (!seemsBase64) {
      return Buffer.from(value).toString('base64');
    }

    try {
      const decoded = Buffer.from(value, 'base64').toString('utf-8');
      const isPrintable = /^[\x20-\x7E]+$/.test(decoded);
      const roundTrip =
        Buffer.from(decoded, 'utf-8').toString('base64') === value;
      return isPrintable && roundTrip
        ? value
        : Buffer.from(value).toString('base64');
    } catch {
      return Buffer.from(value).toString('base64');
    }
  }

  private isPscConsumedError(errorMsg: string): boolean {
    return (
      errorMsg.includes('TOKEN_EXPIRED_OR_CONSUMED') ||
      errorMsg.includes('operation for id not found') ||
      errorMsg.includes('expired or completed')
    );
  }

  private async updateToWaitingAuth(
    docId: string,
    grupo: string,
    currentInfo: any,
    provider?: string,
    errorMsg?: string,
  ) {
    // 30 minutos — tempo razoável para médico perceber a notificação e reautenticar no PSC
    const nextRetryAt = new Date(Date.now() + 30 * 60 * 1000);
    const nextInfo = {
      ...currentInfo,
      status: 'AGUARDANDO_AUTENTICACAO',
      provider: provider || currentInfo.provider,
      lastAttempt: new Date(),
      lastError: errorMsg || currentInfo.lastError,
      nextRetryAt,
    };
    await this.mongoService.updateSignatureStatus(docId, grupo, nextInfo);
  }

  private async applyRetryBackoff(
    docId: string,
    grupo: string,
    currentInfo: any,
    provider: string,
    errorMsg: string,
  ) {
    const retryCount = (currentInfo.retryCount || 0) + 1;

    // Verificar limite máximo de retentativas
    // Após MAX_SIGNATURE_RETRIES, liberar como DIGITALIZADA e notificar cliente
    if (retryCount > MAX_SIGNATURE_RETRIES) {
      this.logger.warn(
        `[SIG_RETRY] Max retries (${MAX_SIGNATURE_RETRIES}) atingido para docId=${docId} grupo=${grupo} provider=${provider}. Liberando como DIGITALIZADA.`,
      );
      await this.releaseAsoAsDigitalizada(docId, grupo, currentInfo, provider);
      return;
    }

    // Backoff progressivo: 1 → 2 → 5 → 15 → 30 min
    let backoffMins: number;
    switch (retryCount) {
      case 1:
        backoffMins = 1;
        break;
      case 2:
        backoffMins = 2;
        break;
      case 3:
        backoffMins = 5;
        break;
      case 4:
        backoffMins = 15;
        break;
      default:
        backoffMins = 30;
        break;
    }

    const nextRetryAt = new Date(Date.now() + backoffMins * 60 * 1000);

    const nextInfo = {
      ...currentInfo,
      status: 'AGUARDANDO_REPROCESSAMENTO',
      provider,
      retryCount,
      lastAttempt: new Date(),
      nextRetryAt,
      lastError: errorMsg,
    };

    await this.mongoService.updateSignatureStatus(docId, grupo, nextInfo);
  }

  /**
   * Libera o ASO como DIGITALIZADA (sem assinatura) após esgotar retentativas.
   * Marca `liberadoComoDigitalizada: true` na signatureInfo para identificação futura.
   * Notifica o backend para enfileirar o e-mail de entrega ao cliente.
   */
  private async releaseAsoAsDigitalizada(
    docId: string,
    grupo: string,
    currentInfo: any,
    provider: string,
  ) {
    const nextInfo = {
      ...currentInfo,
      status: 'ASSINATURA_IGNORADA' as SignatureStatus,
      provider,
      lastAttempt: new Date(),
      nextRetryAt: null,
      liberadoComoDigitalizada: true,
      liberadoComoDigitalizadaEm: new Date(),
    };

    await this.mongoService.updateSignatureStatus(docId, grupo, nextInfo);

    // Notifica o backend: libera o ASO e dispara o email ao cliente
    await this.notifyBackendDigitalizadaFallback(
      docId,
      currentInfo.signedUrl || currentInfo.url,
    ).catch((e: any) =>
      this.logger.error(
        `[SIG_RETRY] Falha ao notificar backend de fallback DIGITALIZADA para ${docId}: ${e?.message}`,
      ),
    );
  }

  /**
   * Notifica o backend para liberar o ASO como DIGITALIZADA (sem assinatura).
   * O backend irá setar status=LIBERADO e enfileirar o email de entrega.
   */
  private async notifyBackendDigitalizadaFallback(
    schedulingId: string,
    asoUrl?: string,
  ) {
    const baseUrl = resolveBackendBaseUrl();
    const token = String(process.env.INTERNAL_WORKER_TOKEN || '').trim();

    if (!baseUrl || !token) {
      this.logger.warn(
        `[SIG_RETRY] BACKEND_INTERNAL_BASE_URL/INTERNAL_WORKER_TOKEN não configurados. Fallback DIGITALIZADA ignorado para ${schedulingId}.`,
      );
      return;
    }

    await axios.post(
      `${baseUrl}/internal/aso/result`,
      {
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
        },
      },
      {
        headers: { 'x-internal-token': token },
        timeout: 15000,
      },
    );

    this.logger.log(
      `[SIG_RETRY] Backend notificado de fallback DIGITALIZADA para schedulingId=${schedulingId}`,
    );
  }

  /**
   * Notifica o backend que um ASO foi assinado digitalmente APÓS já ter sido
   * entregue como DIGITALIZADA. O backend re-envia o email com o PDF assinado.
   */
  private async notifyBackendAsoSignedAfterDelivery(
    schedulingId: string,
    signedUrl: string,
  ) {
    const baseUrl = resolveBackendBaseUrl();
    const token = String(process.env.INTERNAL_WORKER_TOKEN || '').trim();

    if (!baseUrl || !token) {
      this.logger.warn(
        `[SIG_RETRY] BACKEND_INTERNAL_BASE_URL/INTERNAL_WORKER_TOKEN não configurados. signed-after-delivery ignorado para ${schedulingId}.`,
      );
      return;
    }

    await axios.post(
      `${baseUrl}/internal/aso/signed-after-delivery`,
      { schedulingId, url: signedUrl },
      {
        headers: { 'x-internal-token': token },
        timeout: 15000,
      },
    );

    this.logger.log(
      `[SIG_RETRY] Backend notificado de assinatura tardia para schedulingId=${schedulingId}`,
    );
  }

  // === Utilitários Integrados Similares ao AzurePdfService ===

  private async downloadBlobAsBuffer(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }

  private async uploadSignedBuffer(
    pdfBuffer: Buffer,
    originalUrl: string,
  ): Promise<string> {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_CONTAINER_DOCUMENTS || 'documents';

    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined');
    }

    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Parse original URL to find the blob path
    const urlObj = new URL(originalUrl);
    const pathParts = urlObj.pathname.split('/').filter((p) => p !== '');

    // Remove container name from path if it exists
    const blobPathIndex = pathParts.findIndex((p) => p === containerName);
    let blobPath = '';
    if (blobPathIndex !== -1 && blobPathIndex < pathParts.length - 1) {
      blobPath = pathParts.slice(blobPathIndex + 1).join('/');
    } else {
      blobPath = pathParts.join('/');
    }

    // Add a signature suffix to avoid caching issues, or overwrite
    const newBlobPath = blobPath.replace('.pdf', `_assinado_${Date.now()}.pdf`);
    const blockBlobClient = containerClient.getBlockBlobClient(newBlobPath);

    await blockBlobClient.uploadData(pdfBuffer, {
      blobHTTPHeaders: { blobContentType: 'application/pdf' },
    });

    return blockBlobClient.url;
  }
}
