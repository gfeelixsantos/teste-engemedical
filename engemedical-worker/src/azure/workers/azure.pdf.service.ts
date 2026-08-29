import { Injectable } from '@nestjs/common';
import { BlobServiceClient } from '@azure/storage-blob';
import axios from 'axios';
import { PdfmakeService } from 'src/pdfmake/pdfmake.service';
import { MongoService } from 'src/mongo/mongo.service';
import { DequeuedMessageItem } from '@azure/storage-queue';
import { AzureBaseWorker } from '../azure-worker';
import { resultadosExamesQueue } from '../types/azure.types';
import {
  SignatureStatus,
  SchedulingDocument,
} from 'src/mongo/types/scheduling';
import { AppRules } from 'src/core/AppRules';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BryClientService } from 'src/signature/bry-client.service';
import { IUserSettings } from 'src/interfaces/settings';
import { buildUnifiedExamSignature } from 'src/mongo/utils/exam-signature.contract';
import { resolveBackendBaseUrl } from 'src/core/runtime-mode';
import { getExamesList, getExameByCodigo } from 'src/exames/exames.provider';
import { determineExamSignatureEligibility } from 'src/signature/exam-signature-eligibility';
import {
  generateBlobFileName,
  generateBlobPath,
  BlobFileType,
} from 'src/utils/util';

@Injectable()
export class AzurePdfWorkerService extends AzureBaseWorker {
  protected queueName =
    process.env.AZURE_QUEUE_RESULTADOS_EXAMES || 'resultados-exames';
  protected readonly MAX_CONCURRENT_MESSAGES = Math.max(
    1,
    Number(process.env.AZURE_QUEUE_RESULTADOS_MAX_CONCURRENT_MESSAGES || 3),
  );
  protected readonly RECEIVE_BATCH_SIZE = Math.max(
    1,
    Number(process.env.AZURE_QUEUE_RESULTADOS_RECEIVE_BATCH_SIZE || 3),
  );
  private readonly containerName =
    process.env.AZURE_CONTAINER_DOCUMENTS || 'documents';
  private readonly blobConnectionString =
    process.env.AZURE_STORAGE_CONNECTION_STRING;

  constructor(
    private readonly pdfMakeService: PdfmakeService,
    private readonly mongoService: MongoService,
    private readonly supabaseService: SupabaseService,
    private readonly bryClientService: BryClientService,
  ) {
    super();
  }

  protected async handleMessage(message: DequeuedMessageItem): Promise<void> {
    const payload = JSON.parse(message.messageText) as resultadosExamesQueue;
    const { funcionario, profissional } = payload;
    const grupoRaw = (payload.grupo || '').trim();
    const examList = getExamesList();
    const grupoKey = Object.keys(examList).find(
      (k) => k.trim().toLowerCase() === grupoRaw.toLowerCase(),
    );
    const grupo = grupoKey ?? grupoRaw;

    const exameIndex = funcionario.EXAMES.findIndex(
      (e) => e.grupo?.trim().toLowerCase() === grupo.trim().toLowerCase(),
    );
    const codigoExame = exameIndex >= 0 ? funcionario.EXAMES[exameIndex]?.codigoExame : undefined;
    const examGroupConfig = (codigoExame ? getExameByCodigo(codigoExame) : null)
      ?? (grupoKey ? examList[grupoKey]?.[0] : undefined);

    this.logger.log(
      `[${this.queueName}] Iniciando processamento de PDF para ${funcionario.NOME} (${grupoRaw}) codigoExame=${codigoExame || 'n/d'}`,
    );

    if (!examGroupConfig) {
      this.logger.warn(
        `[${this.queueName}] Grupo ${grupoRaw} nao configurado em getExamesList(). Mensagem sera ignorada sem alterar status do exame.`,
      );
      return;
    }

    if (
      examGroupConfig.enviarParaAzure === false ||
      !examGroupConfig.template
    ) {
      this.logger.warn(
        `[${this.queueName}] Grupo ${grupo} (${examGroupConfig.nome}) codigoExame=${codigoExame || 'n/d'} nao possui template PDF ou nao deve ser emitido por este worker. Mensagem sera ignorada e o exame permanecera no fluxo ${examGroupConfig.statusFinalizacao}.`,
      );
      return;
    }

    let signatureInfo: any = {};
    let pdfBuffer: Buffer;
    let finalPdfBuffer: Buffer;
    const fileType: BlobFileType = 'EXAM';
    let isSigned = false;
    const emitToAzure = true;
    let assinaConfig = false;
    let deveAssinarDigitalmente = false;
    let hasRuntimeSigningCapability = false;
    let exameContext: any = null;
    let sessionData: any = null;
    let userSettings: IUserSettings | null = null;
    let providerName: 'PSC' | 'BRYKMS' = 'PSC';
    let pscPadraoName: string | null = null;
    let exameToogleReqSig = false;
    let currentRetryCount = 0;

    if (exameIndex !== -1) {
      exameContext = funcionario.EXAMES[exameIndex];
      exameToogleReqSig = examGroupConfig.requerAssinaturaDigital === true;
      currentRetryCount = exameContext?.signatureInfo?.retryCount || 0;

      if (profissional?.codigo) {
        userSettings = await this.supabaseService.getUserSettingsWithPin(
          profissional.codigo,
        );
        assinaConfig = userSettings?.assina_digitalmente === true;
        pscPadraoName = userSettings?.psc_padrao ?? null;
        providerName =
          userSettings?.assinatura_provider === 'BRYKMS' ||
          userSettings?.provider === 'BRYKMS'
            ? 'BRYKMS'
            : 'PSC';

        if (emitToAzure && exameToogleReqSig) {
          if (providerName === 'BRYKMS') {
            const uuidCert = userSettings?.uuid_cert || null;
            const bryUser =
              userSettings?.bry_cloud_user ||
              userSettings?.bry_user ||
              profissional?.cpf ||
              null;
            const rawPin =
              userSettings?.pin || userSettings?.bry_cloud_pin || null;
            const token =
              userSettings?.token || userSettings?.bry_cloud_token || null;
            const normalizedPin = rawPin
              ? this.normalizePinToBase64(rawPin)
              : null;
            const hasIdentity = !!uuidCert || !!bryUser;
            const hasSecret = !!normalizedPin || !!token;
            hasRuntimeSigningCapability = hasIdentity && hasSecret;
          } else {
            sessionData = await this.supabaseService.getValidPscSession(
              profissional.codigo,
            );
            hasRuntimeSigningCapability = Boolean(
              sessionData?.signature_session,
            );
          }

          if (!assinaConfig && hasRuntimeSigningCapability) {
            this.logger.warn(
              '[' +
                this.queueName +
                '] Configuracao inconsistente de assinatura detectada | profissional=' +
                profissional.codigo +
                ' | provider=' +
                providerName +
                ' | assinaConfig=false | runtimeCapability=true. Prosseguindo com assinatura.',
            );
          }
        }

        this.logger.log(
          '[' +
            this.queueName +
            '] Diagnostico assinatura | profissional=' +
            profissional.codigo +
            ' | provider=' +
            providerName +
            ' | assinaConfig=' +
            assinaConfig +
            ' | pscPadrao=' +
            (pscPadraoName || 'null') +
            ' | grupo=' +
            grupo +
            ' | nomeExame=' +
            (exameContext?.nomeExame || 'n/d') +
            ' | requerAssinatura=' +
            exameToogleReqSig,
        );
      }

      deveAssinarDigitalmente = determineExamSignatureEligibility({
        emitToAzure,
        requiresDigitalSignature: exameToogleReqSig,
        signatureEnabled: assinaConfig,
        hasRuntimeSigningCapability,
      }).shouldSign;
    }

    pdfBuffer = await this.pdfMakeService.createPdf(
      funcionario,
      profissional,
      grupo,
      deveAssinarDigitalmente,
    );

    // Merge com laudo de Restrição Temporária (Opção A — antes da assinatura)
    // Quando o Exame Clínico possui duracaoRestricaoDias preenchido, o laudo de
    // restrição é gerado e concatenado ao PDF do exame clínico ANTES da assinatura,
    // de modo que o documento unificado seja assinado e salvo em EXAMES[i].url.
    if (grupo === 'Exame Clínico') {
      const clinicoIdx = funcionario.EXAMES.findIndex(
        (e) => (e.grupo || '').trim().toLowerCase() === 'exame clínico'.toLowerCase(),
      );
      const restricaoDias =
        clinicoIdx !== -1
          ? funcionario.EXAMES[clinicoIdx].formulario?.duracaoRestricaoDias
          : null;
      if (restricaoDias && restricaoDias !== '') {
        this.logger.log(
          `[${this.queueName}] Restrição temporária detectada (${restricaoDias} dias). Gerando e fazendo merge do laudo de restrição ao Exame Clínico.`,
        );
        const restricaoBuffer = await this.pdfMakeService.createPdf(
          funcionario,
          profissional,
          'restricao',
        );
        pdfBuffer = await this.mergePdfBuffers([pdfBuffer, restricaoBuffer]);
        this.logger.log(
          `[${this.queueName}] Merge concluído. PDF unificado (Exame Clínico + Restrição Temporária) será assinado e salvo em EXAMES[i].url.`,
        );
      }
    }

    finalPdfBuffer = pdfBuffer;

    if (exameIndex !== -1) {
      if (!deveAssinarDigitalmente) {
        this.logger.log(
          '[' +
            this.queueName +
            '] Assinatura nao executada | emitToAzure=' +
            emitToAzure +
            ' | requerAssinatura=' +
            exameToogleReqSig +
            ' | assinaConfig=' +
            assinaConfig +
            ' | provider=' +
            providerName,
        );

        signatureInfo = {
          status: 'NAO_REQUER_ASSINATURA' as SignatureStatus,
          provider: providerName === 'PSC' ? pscPadraoName : providerName,
          kmsType: providerName,
          retryCount: 0,
        };
      } else if (providerName === 'BRYKMS') {
        const uuidCert = userSettings?.uuid_cert || null;
        const bryUser =
          userSettings?.bry_cloud_user ||
          userSettings?.bry_user ||
          profissional?.cpf ||
          null;
        const rawPin = userSettings?.pin || userSettings?.bry_cloud_pin || null;
        const token =
          userSettings?.token || userSettings?.bry_cloud_token || null;
        const normalizedPin = rawPin ? this.normalizePinToBase64(rawPin) : null;

        const hasIdentity = !!uuidCert || !!bryUser;
        const hasSecret = !!normalizedPin || !!token;

        if (!hasIdentity) {
          signatureInfo = {
            status: 'AGUARDANDO_AUTENTICACAO' as SignatureStatus,
            provider: 'BRYKMS',
            kmsType: 'BRYKMS',
            retryCount: 0,
            lastAttempt: new Date(),
            lastError: 'Certificado BRYKMS nao configurado (uuid_cert/user).',
          };
        } else if (!hasSecret) {
          signatureInfo = {
            status: 'AGUARDANDO_AUTENTICACAO' as SignatureStatus,
            provider: 'BRYKMS',
            kmsType: 'BRYKMS',
            retryCount: 0,
            lastAttempt: new Date(),
            lastError: 'PIN/Token BRYKMS nao configurado.',
          };
        } else {
          try {
            this.logger.log(
              '[' +
                this.queueName +
                '] Tentando assinatura imediata BRYKMS para ' +
                grupo +
                '...',
            );
            const signedBuffer = await this.bryClientService.signPdfWithKms({
              pdfBuffer,
              kmsType: 'BRYKMS',
              kmsData: {
                ...(uuidCert ? { uuid_cert: uuidCert } : {}),
                ...(bryUser ? { user: bryUser } : {}),
                ...(normalizedPin ? { pin: normalizedPin } : {}),
                ...(token ? { token } : {}),
              },
            });

            finalPdfBuffer = signedBuffer;
            isSigned = true;

            signatureInfo = {
              status: 'ASSINADO' as SignatureStatus,
              provider: 'BRYKMS',
              kmsType: 'BRYKMS',
              retryCount: 0,
              signedAt: new Date(),
              lastAttempt: new Date(),
            };
          } catch (sigError: any) {
            this.logger.error(
              '[' +
                this.queueName +
                '] Falha na assinatura BRYKMS. Fallback para PDF base. ' +
                sigError.message,
            );

            const errorMsg = sigError?.message || 'Falha na assinatura BRYKMS.';
            const isAuthError = this.isAuthOrCredentialError(sigError);

            signatureInfo = {
              status: isAuthError
                ? ('AGUARDANDO_AUTENTICACAO' as SignatureStatus)
                : ('AGUARDANDO_REPROCESSAMENTO' as SignatureStatus),
              provider: 'BRYKMS',
              kmsType: 'BRYKMS',
              retryCount: isAuthError ? 0 : currentRetryCount + 1,
              nextRetryAt: isAuthError
                ? undefined
                : new Date(Date.now() + Math.min(Math.pow(2, currentRetryCount + 1) * 5, 1440) * 60000),
              lastAttempt: new Date(),
              lastError: errorMsg,
            };
          }
        }
      } else {
        if (!sessionData) {
          sessionData = await this.supabaseService.getValidPscSession(
            profissional.codigo,
          );
        }

        if (!sessionData) {
          signatureInfo = {
            status: 'AGUARDANDO_AUTENTICACAO' as SignatureStatus,
            provider: pscPadraoName,
            kmsType: 'PSC',
            retryCount: 0,
            lastAttempt: new Date(),
          };
        } else {
          try {
            this.logger.log(
              `[${this.queueName}] Tentando assinatura imediata PSC para ${grupo}...`,
            );
            const signedBuffer = await this.bryClientService.assinarPdfBry(
              pdfBuffer,
              sessionData.signature_session,
              sessionData.integra_url,
            );

            finalPdfBuffer = signedBuffer;
            isSigned = true;

            signatureInfo = {
              status: 'ASSINADO' as SignatureStatus,
              provider: sessionData.psc_name || sessionData.provider,
              kmsType: 'PSC',
              retryCount: 0,
              signedAt: new Date(),
              lastAttempt: new Date(),
            };
          } catch (sigError: any) {
            this.logger.error(
              `[${this.queueName}] ❌ Falha na assinatura imediata. Fallback para PDF base. ${sigError.message}`,
            );

            const errorMsg = sigError.message || '';
            const isAuthError =
              sigError.status === 401 || errorMsg.includes('Unauthorized');
            const isConsumedError =
              errorMsg.includes('TOKEN_EXPIRED_OR_CONSUMED') ||
              errorMsg.includes('operation for id not found') ||
              errorMsg.includes('expired or completed');

            if (isAuthError || isConsumedError) {
              await this.supabaseService.invalidatePscSession(
                profissional.codigo,
                sessionData.signature_session,
                'Token consumido ou expirado pela API BRy no fluxo imediato',
              );
              signatureInfo = {
                status: 'AGUARDANDO_AUTENTICACAO' as SignatureStatus,
                provider: sessionData.psc_name || sessionData.provider,
                kmsType: 'PSC',
                retryCount: 0,
                lastAttempt: new Date(),
                lastError: isConsumedError
                  ? 'Sessão esgotada ou inválida. Reautentique-se.'
                  : 'Sessão expirada na assinatura imediata',
              };
            } else {
              signatureInfo = {
                status: 'AGUARDANDO_REPROCESSAMENTO' as SignatureStatus,
                provider: sessionData.psc_name || sessionData.provider,
                kmsType: 'PSC',
                retryCount: currentRetryCount + 1,
                nextRetryAt: new Date(Date.now() + Math.min(Math.pow(2, currentRetryCount + 1) * 5, 1440) * 60000),
                lastAttempt: new Date(),
                lastError: errorMsg,
              };
            }
          }
        }
      }
    }

    // Gera nome padronizado
    const uploadDate = new Date();
    const finalFileName = generateBlobFileName({
      type: isSigned ? 'EXAM_SIGNED' : 'EXAM',
      empresaCode: funcionario.CODIGOEMPRESA,
      funcionarioName: funcionario.NOME,
      documentType: grupo,
      date: uploadDate,
    });

    // Gera path completo
    const blobPath = generateBlobPath({
      fileType: 'exames',
      empresaCode: funcionario.CODIGOEMPRESA,
      prontuario: funcionario.CODIGOPRONTUARIO,
      fileName: finalFileName,
      date: uploadDate,
    });

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      this.blobConnectionString!,
    );
    const containerClient = blobServiceClient.getContainerClient(
      this.containerName,
    );
    await containerClient.createIfNotExists();

    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

    await blockBlobClient.uploadData(finalPdfBuffer, {
      blobHTTPHeaders: { blobContentType: 'application/pdf' },
    });

    const pdfUrl = blockBlobClient.url;

    if (exameIndex !== -1) {
      funcionario.EXAMES[exameIndex] = {
        ...funcionario.EXAMES[exameIndex],
        url: pdfUrl,
        signatureInfo,
      };
    }

    await this.mongoService.updateExamGroupDocument(
      funcionario,
      grupo,
      pdfUrl,
      signatureInfo,
    );

    await this.notifyBackendExamUpdated({
      schedulingId: String((funcionario as any)?._id || ''),
      grupoExame: grupo,
      examCodes: funcionario.EXAMES.filter(
        (exam) =>
          exam.grupo?.trim().toLowerCase() === grupo.trim().toLowerCase(),
      )
        .map((exam) => exam.codigoExame)
        .filter(Boolean),
      signatureInfo,
      url: pdfUrl,
      commandId: message.messageId,
    });

    this.logger.log(
      `[${this.queueName}] ✅ PDF processado e salvo em: ${blockBlobClient.url}`,
    );
  }

  /**
   * Concatena múltiplos buffers de PDF em um único documento.
   * Usado para unificar o PDF do Exame Clínico com o laudo de Restrição Temporária
   * antes da assinatura digital, garantindo que o documento unificado seja assinado
   * e salvo em EXAMES[i].url.
   */
  private async mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
    const { PDFDocument } = await import('pdf-lib');
    const merged = await PDFDocument.create();
    for (const buf of buffers) {
      const doc = await PDFDocument.load(buf);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
    return Buffer.from(await merged.save());
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

  private async postInternalCallback(
    path: string,
    body: any,
    retryCount = 0,
    maxRetries = 3,
  ) {
    const baseUrl = resolveBackendBaseUrl();
    const token = String(process.env.INTERNAL_WORKER_TOKEN || '').trim();

    if (!baseUrl || !token) {
      this.logger.warn(
        `[${this.queueName}] BACKEND_INTERNAL_BASE_URL/INTERNAL_WORKER_TOKEN nao configurados. Callback ignorado para ${path}.`,
      );
      return;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const requestUrl = `${baseUrl}${normalizedPath}`;

    try {
      await axios.post(requestUrl, body, {
        headers: {
          'x-internal-token': token,
        },
        timeout: 15000,
      });
    } catch (error) {
      const isConnRefused =
        axios.isAxiosError(error) &&
        (error.code === 'ECONNREFUSED' ||
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('connect ECONNREFUSED'));

      if (isConnRefused && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        const schedulingId = body?.schedulingId || 'n/a';
        this.logger.warn(
          `[${this.queueName}] Conexao recusada ao chamar ${normalizedPath} | schedulingId=${schedulingId} | url=${requestUrl} | tentativa=${retryCount + 1}/${maxRetries} | aguardando=${delay}ms`,
        );
        await new Promise((r) => setTimeout(r, delay));
        return this.postInternalCallback(path, body, retryCount + 1, maxRetries);
      }

      if (axios.isAxiosError(error)) {
        const responseData =
          typeof error.response?.data === 'object'
            ? JSON.stringify(error.response?.data)
            : String(error.response?.data || '');
        this.logger.error(
          `[${this.queueName}] Callback interno falhou | path=${normalizedPath} status=${error.response?.status ?? 'n/a'} url=${requestUrl} response=${responseData || '-'}`,
        );
      }

      throw error;
    }
  }

  private getAxiosStatus(error: unknown): number | undefined {
    return axios.isAxiosError(error) ? error.response?.status : undefined;
  }

  private async notifyBackendExamUpdated(params: {
    schedulingId: string;
    grupoExame: string;
    examCodes: string[];
    signatureInfo: any;
    url: string;
    commandId: string;
  }) {
    const signature = buildUnifiedExamSignature(
      params.signatureInfo,
      params.url,
    );

    if (!params.schedulingId || !params.grupoExame || !signature) {
      this.logger.warn(
        `[${this.queueName}] Callback interno do exame ignorado por payload incompleto.`,
      );
      return;
    }

    this.logger.log(
      `[${this.queueName}][CALLBACK][SIGNATURE] Enviando callback de assinatura | schedulingId=${params.schedulingId} | grupo=${params.grupoExame} | commandId=${params.commandId} | url=${params.url}`,
    );
    try {
      await this.postInternalCallback('/internal/signature/exam-updated', {
        schedulingId: params.schedulingId,
        grupoExame: params.grupoExame,
        url: params.url,
        commandId: params.commandId,
        signature: {
          ...signature,
          lastCommandId: params.commandId,
        },
      });
      this.logger.log(
        `[${this.queueName}][CALLBACK][SIGNATURE] Callback de assinatura enviado com sucesso | schedulingId=${params.schedulingId} | grupo=${params.grupoExame} | commandId=${params.commandId}`,
      );
    } catch (error) {
      const status = this.getAxiosStatus(error);
      if (status === 400 || status === 404 || status === 422) {
        this.logger.warn(
          `[${this.queueName}] Backend rejeitou callback moderno de assinatura. Seguiremos com callback de resultado para manter o fluxo vivo | schedulingId=${params.schedulingId} | grupo=${params.grupoExame} | commandId=${params.commandId} | status=${status}`,
        );
      } else {
        throw error;
      }
    }

    if (params.examCodes.length > 0) {
      this.logger.log(
        `[${this.queueName}][CALLBACK][RESULT] Enviando callback de resultado | schedulingId=${params.schedulingId} | examCodes=[${params.examCodes.join(',')}] | commandId=${params.commandId} | url=${params.url}`,
      );
      await this.postInternalCallback('/internal/exam/result-updated', {
        schedulingId: params.schedulingId,
        examCodes: params.examCodes,
        url: params.url,
        source: 'worker-pdf',
        commandId: params.commandId,
      });
      this.logger.log(
        `[${this.queueName}][CALLBACK][RESULT] Callback de resultado enviado com sucesso | schedulingId=${params.schedulingId} | examCodes=[${params.examCodes.join(',')}] | commandId=${params.commandId}`,
      );
    }

    this.logger.log(
      `[${this.queueName}] Callback interno enviado para backend | schedulingId=${params.schedulingId} | grupo=${params.grupoExame} | commandId=${params.commandId}`,
    );
  }

  private getRequerAssinaturaDigital(
    nomeExame: string,
    grupo: string,
  ): boolean {
    const requerAssinaturaConfig: Record<string, boolean> = {
      'Exame Clínico': true,
      Audiometria: true,
      'Acuidade Visual': true,
      Psicossocial: true,
      Espirometria: true,
      Dinamometria: true,
      Ultrassom: true,
      Triagem: true,
      'Restrição Temporária': true,
    };
    return (
      requerAssinaturaConfig[grupo] ||
      requerAssinaturaConfig[nomeExame] ||
      false
    );
  }
}
