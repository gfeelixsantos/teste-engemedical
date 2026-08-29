import { Injectable } from '@nestjs/common';
import { DequeuedMessageItem } from '@azure/storage-queue';
import axios from 'axios';
import { ObjectId } from 'mongodb';
import { AzureBlobService } from '../AzureBlob.service';
import { AzureBaseWorker } from '../azure-worker';
import { AsoEnriquecimentoMessage } from '../types/aso.types';
import { runWithContext } from 'src/core/logger/async-storage';
import { MongoService } from 'src/mongo/mongo.service';
import { determineAsoCallbackStatus } from 'src/signature/aso-callback-status';
import { AsoSignatureService } from 'src/signature/aso-signature.service';
import { resolveAsoMetadata } from 'src/signature/resolve-aso-metadata';
import { WsUploadAsoDigital } from 'src/soc/webservice/upload/WsUploadAsoDigital';
import { SupabaseService } from 'src/supabase/supabase.service';
import {
  standardizeFileName,
  generateBlobFileName,
  generateBlobPath,
} from 'src/utils/util';
import { resolveBackendBaseUrl } from 'src/core/runtime-mode';
import { resolveAsoProfessionalCode } from './resolve-aso-professional-code';

@Injectable()
export class AzureAsoEnrichmentWorkerService extends AzureBaseWorker {
  protected queueName =
    process.env.AZURE_QUEUE_ASO_ENRIQUECIMENTO || 'aso-enriquecimento';
  protected readonly MAX_CONCURRENT_MESSAGES = 1;
  protected readonly RECEIVE_BATCH_SIZE = 1;
  protected readonly DELAY_BETWEEN_MESSAGES = 2000;

  protected isWorkerEnabled(): boolean {
    return process.env.ENABLE_WORKER_ASO_ENRICHMENT !== 'false';
  }

  constructor(
    private readonly mongoService: MongoService,
    private readonly blobService: AzureBlobService,
    private readonly asoSignatureService: AsoSignatureService,
    private readonly supabaseService: SupabaseService,
  ) {
    super();
  }

  protected async handleMessage(message: DequeuedMessageItem): Promise<void> {
    let jsonString = message.messageText;
    if (
      !jsonString.trim().startsWith('{') &&
      !jsonString.trim().startsWith('[')
    ) {
      try {
        jsonString = Buffer.from(jsonString, 'base64').toString('utf-8');
      } catch (e) {
        // Fallback pra string original
      }
    }
    const payload = JSON.parse(jsonString) as AsoEnriquecimentoMessage;
    const {
      schedulingId,
      url: originalUrl,
      nomeFuncionario,
      nomeEmpresa,
      tipoExame,
      codEmpresa,
      medico,
      prontuario,
    } = payload;
    const trimmedId = schedulingId?.trim();
    const startTime = Date.now();
    const commandId =
      String(payload.commandId || (message as any)?.messageId || '').trim() ||
      `aso-enrichment:${trimmedId}:${Date.now()}`;

    await runWithContext(
      { companyId: codEmpresa, examId: trimmedId, patient: nomeFuncionario },
      async () => {
        let signatureApplied: 'DIGITALIZADA' | 'PSC' | 'BRYKMS' =
          'DIGITALIZADA';
        let signatureStatus: 'LIBERADO' | 'PENDENTE' | 'FALHA' = 'LIBERADO';
        let requiresSignature = true;
        let signatureEnabled = false;
        let signatureError: string | undefined;
        let validationUrl = '';
        let professionalCode = '';
        let hasEmbeddedSignature = false;
        let itiValidationRequired = false;

        this.logger.log({
          msg: 'Processando enriquecimento de ASO',
          patient: nomeFuncionario,
          company: nomeEmpresa,
          operation: 'handleMessage',
        });

        try {
          if (!this.mongoService.isReady) {
            this.logger.debug('Aguardando MongoService ficar pronto...');
            const ready = await this.mongoService.waitForReady();
            if (!ready) {
              throw new Error('MongoService nao inicializado apos timeout.');
            }
          }

          const scheduling =
            await this.mongoService.schedulingsCollection.findOne({
              _id: new ObjectId(trimmedId),
            });
          if (!scheduling) {
            throw new Error(
              `Scheduling ${trimmedId} nao encontrado no MongoDB`,
            );
          }

          // NOTA: ASOINFO.status='DIGITALIZADA' é definido pelo aso-generator como
          // status transitório ("PDF gerado, aguardando assinatura digital"), NÃO como
          // indicador de "já digitalizado sem assinatura". Usamos apenas ASOSTATUS
          // para detectar ASOs legados que não requerem assinatura digital.
          requiresSignature =
            (scheduling as any).ASOSTATUS !== 'DIGITALIZADA';

          // Se o ASO ja foi liberado, nao processamos novamente via worker (evita loops e re-enriquecimento)
          if (scheduling.ASOINFO?.status === 'LIBERADO') {
            this.logger.log({
              msg: 'ASO ja liberado anteriormente. Ignorando reprocessamento duplicado.',
              patient: nomeFuncionario,
              schedulingId: trimmedId,
            });
            return; // Encerra com sucesso (deletara a mensagem da fila no parent)
          }

          const urlToDownload = originalUrl || scheduling?.ASOINFO?.url;

          // Usa nomenclatura antiga apenas para download (arquivos legados)
          let blobName = `aso/${new Date().getFullYear()}/${trimmedId}.pdf`;
          let containerName =
            process.env.AZURE_CONTAINER_DOCUMENTS || 'documents';

          if (urlToDownload) {
            try {
              const urlObj = new URL(urlToDownload);
              const pathParts = urlObj.pathname.split('/').filter(Boolean);
              if (pathParts.length >= 2) {
                containerName = pathParts[0];
                blobName = decodeURIComponent(pathParts.slice(1).join('/'));
                this.logger.debug({
                  msg: 'URL do blob priorizada para download',
                  container: containerName,
                  blob: blobName,
                });
              } else {
                this.logger.warn({
                  msg: 'URL do blob invalida ou curta demais. Usando fallback.',
                  url: urlToDownload,
                });
              }
            } catch (urlError: any) {
              this.logger.warn({
                msg: 'Falha ao parsear URL do payload. Usando fallback.',
                url: urlToDownload,
                error: urlError?.message,
              });
            }
          }

          this.logger.debug({
            msg: 'Iniciando download',
            container: containerName,
            blob: blobName,
          });

          const pdfBufferOriginal = await this.blobService
            .download(containerName, blobName)
            .catch(async (blobError: any) => {
              this.logger.warn({
                msg: 'Erro no download primario. Tentando busca por padrao novo.',
                container: containerName,
                blob: blobName,
                error: blobError?.message,
              });

              // Tenta compor o caminho novo se tivermos dados suficientes
              const empresaCode =
                payload.codEmpresa || scheduling.CODIGOEMPRESA;
              const prontuarioId =
                prontuario || scheduling.CODIGOPRONTUARIO || trimmedId;

              if (empresaCode && prontuarioId) {
                const year = new Date().getFullYear();
                const month = String(new Date().getMonth() + 1).padStart(
                  2,
                  '0',
                );
                // Buscamos qualquer PDF nesse diretorio (as vezes o hash muda)
                const searchPrefix = `aso/${year}/${month}/${empresaCode}/${prontuarioId}/`;

                try {
                  const blobs = (await this.blobService.listBlobs(
                    containerName,
                    searchPrefix,
                  )) as any[];
                  if (blobs.length > 0) {
                    const latestBlob = blobs.sort(
                      (a, b) =>
                        b.properties.lastModified.getTime() -
                        a.properties.lastModified.getTime(),
                    )[0];
                    this.logger.log({
                      msg: 'Blob alternativo encontrado via busca por prefixo',
                      originalBlob: blobName,
                      newBlob: latestBlob.name,
                    });
                    return await this.blobService.download(
                      containerName,
                      latestBlob.name,
                    );
                  }
                } catch (searchErr) {
                  this.logger.error({
                    msg: 'Falha na busca de blob alternativo',
                    error:
                      searchErr instanceof Error
                        ? searchErr.message
                        : String(searchErr),
                  });
                }
              }

              throw new Error(
                `Falha no download do PDF (${blobName}): ${blobError?.message}`,
              );
            });
          let pdfBuffer = pdfBufferOriginal;

          const pacienteNome = scheduling.NOME || nomeFuncionario;
          const empresaNome = scheduling.NOMEEMPRESA || nomeEmpresa;
          const dataExame =
            scheduling.DATAAGENDAMENTO ||
            new Date().toLocaleDateString('pt-BR');
          const tipoExameNome = scheduling.TIPOEXAMENOME || tipoExame;
          const exameClinico = scheduling.EXAMES?.find(
            (ex) =>
              ex.nomeExame?.toUpperCase().includes('CLIN') ||
              ex.grupo?.toUpperCase().includes('CLIN') ||
              ex.codigoExame === 'clinico',
          );

          professionalCode = resolveAsoProfessionalCode({
            payloadMedico: medico,
            exameClinico,
            scheduling,
          });

          let retryInfo: { pending: boolean; count: number; nextRetryAt?: Date } | undefined;

          if (professionalCode) {
            const userSettings =
              await this.supabaseService.getUserSettingsWithPin(
                professionalCode,
              );
            const assinaDigitalmente =
              userSettings?.assina_digitalmente === true;
            signatureEnabled = assinaDigitalmente;

            if (assinaDigitalmente && requiresSignature) {
              this.logger.log({
                msg: 'Aplicando assinatura digital',
                profissional: professionalCode,
                provider: userSettings?.assinatura_provider || 'PSC',
              });

              const provider =
                userSettings?.assinatura_provider === 'BRYKMS' ||
                  userSettings?.provider === 'BRYKMS'
                  ? 'BRYKMS'
                  : 'PSC';
              signatureApplied = provider;

              try {
                const profData =
                  payload.profissional ||
                  scheduling?.ASOINFO?.professional ||
                  null;
                let dbUser: any = null;
                const clinicalProfessionalData =
                  exameClinico?.professional ||
                  exameClinico?.profissionalData ||
                  null;

                const professionalNameHint =
                  profData?.nome ||
                  profData?.name ||
                  clinicalProfessionalData?.nome ||
                  clinicalProfessionalData?.profissional ||
                  exameClinico?.profissional ||
                  exameClinico?.formulario?.medico ||
                  exameClinico?.formulario?.profissional ||
                  scheduling.MEDICO ||
                  '';

                try {
                  const usersColl = this.mongoService.db.collection('users');
                  if (professionalCode || professionalNameHint) {
                    const numericProfessionalCode = Number(professionalCode);
                    const codeCandidates = Array.from(
                      new Set(
                        [
                          professionalCode,
                          Number.isFinite(numericProfessionalCode)
                            ? String(numericProfessionalCode)
                            : '',
                        ].filter((value) => String(value || '').trim() !== ''),
                      ),
                    );
                    const nameCandidates = Array.from(
                      new Set(
                        [
                          professionalNameHint,
                          scheduling?.ASOINFO?.professional?.nome,
                          exameClinico?.formulario?.medico,
                          exameClinico?.formulario?.profissional,
                          scheduling.MEDICO,
                        ].filter((value) => String(value || '').trim() !== ''),
                      ),
                    );
                    const escapeRegExp = (value: string) =>
                      value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                    dbUser = await usersColl.findOne({
                      $or: [
                        ...codeCandidates.flatMap((candidate) => [
                          { codigo: candidate },
                          ...(Number.isFinite(Number(candidate))
                            ? [{ codigo: Number(candidate) }]
                            : []),
                        ]),
                        ...nameCandidates.flatMap((candidate) => [
                          { nome: candidate },
                          { name: candidate },
                          {
                            nome: new RegExp(
                              `^${escapeRegExp(candidate)}$`,
                              'i',
                            ),
                          },
                          {
                            name: new RegExp(
                              `^${escapeRegExp(candidate)}$`,
                              'i',
                            ),
                          },
                        ]),
                        ...(professionalNameHint
                          ? [{ profissional: professionalNameHint }]
                          : []),
                      ],
                    });
                  }
                } catch (dbErr: any) {
                  this.logger.debug({
                    msg: 'Falha ao buscar profissional no banco',
                    profissional: professionalCode,
                    error: dbErr?.message,
                  });
                }

                // --- 2. FALLBACK SUPABASE/SOC (ROBUSTO) ---
                if (!dbUser?.conselho || !dbUser?.cpf) {
                  try {
                    const fallbackMetadata =
                      await this.supabaseService.getProfessionalMetadata(
                        professionalCode,
                      );
                    if (fallbackMetadata) {
                      dbUser = {
                        ...(dbUser || {}),
                        ...fallbackMetadata,
                      };
                      this.logger.debug({
                        msg: 'Metadata do profissional enriquecida via Supabase/SOC',
                        professionalCode,
                        crm: fallbackMetadata.conselho,
                      });
                    } else if (professionalNameHint) {
                      const fallbackByName =
                        await this.supabaseService.getProfessionalMetadataByName(
                          professionalNameHint,
                        );
                      if (fallbackByName) {
                        dbUser = {
                          ...(dbUser || {}),
                          ...fallbackByName,
                        };
                        this.logger.debug({
                          msg: 'Metadata do profissional enriquecida via Supabase/SOC (por nome)',
                          professionalName: professionalNameHint,
                          crm: fallbackByName.conselho,
                        });
                      }
                    }
                  } catch (supabaseErr: any) {
                    this.logger.warn({
                      msg: 'Falha no fallback Supabase para enriquecimento',
                      error: supabaseErr.message,
                    });
                  }
                }

                const asoMetadata = resolveAsoMetadata({
                  payloadProfessional: profData,
                  asoProfessional: scheduling?.ASOINFO?.professional,
                  clinicalProfessionalData,
                  exameClinico,
                  scheduling,
                  dbUser,
                  trimmedId,
                });

                this.logger.debug({
                  msg: 'Metadata do carimbo oficial do ASO resolvida',
                  professionalName: asoMetadata.professionalName,
                  crm: asoMetadata.crm || null,
                  uf: asoMetadata.uf || null,
                  cpf: asoMetadata.cpf ? '***' : null,
                  prontuario: asoMetadata.prontuario,
                });

                if (provider === 'BRYKMS') {
                  const uuidCert = userSettings?.uuid_cert;
                  const bryUser =
                    userSettings?.bry_cloud_user ||
                    userSettings?.bry_user ||
                    profData?.cpf;
                  const rawPin =
                    userSettings?.pin || userSettings?.bry_cloud_pin;
                  const token =
                    userSettings?.token || userSettings?.bry_cloud_token;
                  const normalizedPin = rawPin
                    ? this.normalizePinToBase64(rawPin)
                    : null;

                  const kmsData = {
                    ...(uuidCert ? { uuid_cert: uuidCert } : {}),
                    ...(bryUser ? { user: bryUser } : {}),
                    ...(normalizedPin ? { pin: normalizedPin } : {}),
                    ...(token ? { token } : {}),
                  };

                  const result = await this.asoSignatureService.signAndValidate(
                    pdfBuffer,
                    'BRYKMS',
                    kmsData,
                    trimmedId,
                    pacienteNome,
                    asoMetadata,
                  );
                  pdfBuffer = result.signedPdf;
                  signatureApplied = 'BRYKMS';
                  validationUrl = result.validationUrl || '';
                  hasEmbeddedSignature = result.hasEmbeddedSignature;
                  itiValidationRequired = result.itiValidationEnabled;
                  signatureStatus =
                    result.hasEmbeddedSignature &&
                      (!result.itiValidationEnabled || Boolean(validationUrl))
                      ? 'LIBERADO'
                      : 'PENDENTE';
                } else {
                  const sessionData =
                    await this.supabaseService.getValidPscSession(
                      professionalCode,
                    );

                  if (sessionData) {
                    const result =
                      await this.asoSignatureService.signAndValidate(
                        pdfBuffer,
                        'PSC',
                        {
                          token: sessionData.signature_session,
                          url: sessionData.integra_url,
                        },
                        trimmedId,
                        pacienteNome,
                        asoMetadata,
                      );
                    pdfBuffer = result.signedPdf;
                    signatureApplied = 'PSC';
                    validationUrl = result.validationUrl || '';
                    hasEmbeddedSignature = result.hasEmbeddedSignature;
                    itiValidationRequired = result.itiValidationEnabled;
                    signatureStatus =
                      result.hasEmbeddedSignature &&
                        (!result.itiValidationEnabled || Boolean(validationUrl))
                        ? 'LIBERADO'
                        : 'PENDENTE';
                  } else {
                    signatureApplied = 'PSC';
                    signatureStatus = 'PENDENTE';
                    signatureError =
                      'Sessao PSC nao encontrada para assinatura do ASO';
                    const retryDelayMs = Number(process.env.ASO_ENRICHMENT_RETRY_DELAY_MS || 300000);
                    retryInfo = {
                      pending: true,
                      count: 0,
                      nextRetryAt: new Date(Date.now() + retryDelayMs),
                    };
                    this.logger.warn({
                      msg: 'Sessao PSC nao encontrada para o profissional, retry agendado',
                      profissional: professionalCode,
                      nextRetryAt: retryInfo.nextRetryAt,
                    });
                  }
                }
              } catch (sigError: any) {
                const signatureMessage =
                  sigError instanceof Error
                    ? sigError.message
                    : String(sigError);
                const isPscAuthError =
                  provider === 'PSC' && this.isAuthOrCredentialError(sigError);
                signatureStatus = isPscAuthError ? 'PENDENTE' : 'FALHA';
                signatureError = signatureMessage;
                if (isPscAuthError) {
                  const retryDelayMs = Number(process.env.ASO_ENRICHMENT_RETRY_DELAY_MS || 300000);
                  retryInfo = {
                    pending: true,
                    count: 0,
                    nextRetryAt: new Date(Date.now() + retryDelayMs),
                  };
                }
                this.logger.error({
                  msg: 'Erro ao aplicar assinatura digital',
                  error: signatureMessage,
                });
              }
            } else if (requiresSignature) {
              signatureStatus = 'PENDENTE';
              signatureError =
                'Profissional sem assinatura digital habilitada para liberacao do ASO';
              this.logger.debug({
                msg: 'Profissional nao possui assinatura digital habilitada',
                profissional: professionalCode,
              });
            }
          } else if (requiresSignature) {
            signatureStatus = 'PENDENTE';
            signatureError =
              'Codigo do profissional nao identificado para assinatura do ASO';
            this.logger.warn({
              msg: 'Codigo do profissional nao identificado para o agendamento',
              examId: trimmedId,
            });
          }

          try {
            this.logger.debug({
              msg: 'Iniciando upload SOCGED',
              patient: pacienteNome,
              operation: 'uploadSocged',
            });
            const dataFormatada = dataExame.replace(/\//g, '-');
            const fileName = standardizeFileName(
              'ASO',
              pacienteNome,
              tipoExameNome,
              dataFormatada,
            );
            await WsUploadAsoDigital({
              arquivo: pdfBuffer,
              codEmpresa: scheduling.CODIGOEMPRESA || codEmpresa,
              codFuncionario: scheduling.CODIGO || scheduling.codFuncionario,
              sequencialFicha: scheduling.SEQUENCIAFICHA,
              nomeArquivo: fileName,
              nomeGed: fileName,
              codigoGed: '',
              schedulingId: trimmedId,
            });
            this.logger.log({
              msg: 'Upload SOCGED realizado com sucesso',
              patient: pacienteNome,
            });
          } catch (socgedError: any) {
            this.logger.error({
              msg: 'Erro no upload SOCGED',
              patient: pacienteNome,
              error: socgedError?.message,
            });
          }

          // Gera nome padronizado para ASO (assinado ou não)
          const uploadDate = new Date();
          const isSigned =
            signatureStatus === 'LIBERADO' &&
            signatureApplied !== 'DIGITALIZADA';
          const finalFileName = generateBlobFileName({
            type: isSigned ? 'ASO_SIGNED' : 'ASO',
            empresaCode: scheduling.CODIGOEMPRESA || codEmpresa,
            funcionarioName: pacienteNome,
            documentType: tipoExameNome,
            date: uploadDate,
          });

          // Gera path completo
          const finalBlobName = generateBlobPath({
            fileType: 'aso',
            empresaCode: scheduling.CODIGOEMPRESA || codEmpresa,
            prontuario: scheduling.CODIGOPRONTUARIO || trimmedId,
            fileName: finalFileName,
            date: uploadDate,
          });

          let blobMetadata: Record<string, string> | undefined;
          try {
            blobMetadata = {
              nomeEmpresa: scheduling.NOMEEMPRESA || nomeEmpresa || '',
              nomeFuncionario: pacienteNome,
              codigoEmpresa: String(scheduling.CODIGOEMPRESA || codEmpresa || ''),
              tipoExame: tipoExameNome,
              prontuario: String(scheduling.CODIGOPRONTUARIO || trimmedId || ''),
              ano: String(uploadDate.getFullYear()),
              mes: String(uploadDate.getMonth() + 1).padStart(2, '0'),
            };
          } catch (metaErr: any) {
            this.logger.warn({ msg: 'Falha ao construir metadados do blob', error: metaErr?.message });
          }

          this.logger.debug({
            msg: 'Fazendo upload do PDF para blob storage',
            container: containerName,
            blob: finalBlobName,
            status: signatureApplied,
          });
          const finalUrl = await this.blobService.upload(
            containerName,
            finalBlobName,
            pdfBuffer,
            blobMetadata,
          );

          const callbackStatus = determineAsoCallbackStatus({
            professionalCode,
            signatureEnabled,
            signatureStatus,
            hasEmbeddedSignature,
            itiValidationRequired,
            validationUrl, requiresSignature,
          });

          await this.notifyBackendAsoUpdated({
            schedulingId: trimmedId,
            commandId,
            status: callbackStatus,
            url: finalUrl,
            validacao: validationUrl,
            signature: this.buildAsoSignatureInfo({
              provider: signatureApplied,
              status: signatureStatus,
              url: finalUrl,
              validacao: validationUrl,
              requiresSignature,
              commandId,
              profissionalCodigo: professionalCode,
              error: signatureError,
              ...(retryInfo ? { retry: retryInfo } : {}),
            }),
          });

          this.logger.log({
            msg: 'Processo concluido com sucesso',
            totalDurationMs: Date.now() - startTime,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            {
              msg: 'Erro no processamento de enriquecimento',
              error: errorMessage,
              operation: 'handleMessage',
            },
            error instanceof Error ? error.stack : undefined,
          );

          if (
            this.mongoService.isReady &&
            this.mongoService.schedulingsCollection
          ) {
            const currentRetryCount = payload.retryCount || 0;
            const nextRetryCount = currentRetryCount + 1;
            const backoffMinutes = Math.min(
              Math.pow(2, nextRetryCount) * 5,
              1440,
            );
            const nextRetryAt = new Date(Date.now() + backoffMinutes * 60000);

            try {
              await this.notifyBackendAsoUpdated({
                schedulingId: trimmedId,
                commandId,
                status: 'FALHA',
                url: originalUrl,
                signature: this.buildAsoSignatureInfo({
                  provider: signatureApplied,
                  status: 'FALHA',
                  url: originalUrl,
                  validacao: validationUrl,
                  requiresSignature,
                  commandId,
                  profissionalCodigo: professionalCode,
                  error: errorMessage,
                  retry: {
                    pending: true,
                    count: nextRetryCount,
                    nextRetryAt,
                  },
                }),
                error: errorMessage,
                retry: {
                  pending: true,
                  count: nextRetryCount,
                  nextRetryAt,
                },
              });
            } catch (callbackError: any) {
              this.logger.error({
                msg: 'Falha ao notificar backend sobre erro do ASO',
                error:
                  callbackError instanceof Error
                    ? callbackError.message
                    : String(callbackError),
              });
              throw error;
            }

            // Nao relancamos o erro se agendamos um retry no Mongo.
            // O backend passa a ser a fonte de verdade do retry apos callback bem-sucedido.
            this.logger.warn({
              msg: `Falha no processamento do ASO para ${nomeFuncionario}. Retry informado ao backend para ${nextRetryAt.toISOString()}. Mensagem sera removida da fila do Azure.`,
              error: errorMessage,
            });
          } else {
            this.logger.error({
              msg: 'Falha ao atualizar erro no Mongo: schedulingsCollection indefinida ou Mongo nao pronto. Relancando para retry da fila.',
              operation: 'errorUpdate',
            });
            throw error;
          }
        }
      },
    );
  }

  private normalizePinToBase64(pinValue: string): string {
    const value = String(pinValue).trim();
    if (!value) return value;
    const seemsBase64 =
      value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
    if (!seemsBase64) return Buffer.from(value).toString('base64');
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

  private async postInternalCallback(path: string, body: any) {
    const baseUrl = resolveBackendBaseUrl();
    const token = String(process.env.INTERNAL_WORKER_TOKEN || '').trim();

    if (!baseUrl || !token) {
      this.logger.warn(
        `[${this.queueName}] BACKEND_INTERNAL_BASE_URL/INTERNAL_WORKER_TOKEN nao configurados. Callback ignorado para ${path}.`,
      );
      return;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    await axios.post(`${baseUrl}${normalizedPath}`, body, {
      headers: {
        'x-internal-token': token,
      },
      timeout: 15000,
    });
  }

  private buildAsoSignatureInfo(params: {
    provider: 'DIGITALIZADA' | 'PSC' | 'BRYKMS';
    status: 'LIBERADO' | 'PENDENTE' | 'FALHA';
    url?: string;
    validacao?: string;
    requiresSignature: boolean;
    commandId: string;
    profissionalCodigo?: string;
    error?: string;
    retry?: {
      pending: boolean;
      count: number;
      nextRetryAt?: Date;
    };
  }) {
    return {
      documentType: 'ASO' as const,
      requiresSignature: params.requiresSignature,
      status: params.status,
      provider: params.provider,
      signedAt: params.status === 'LIBERADO' ? new Date() : undefined,
      signedUrl: params.url || undefined,
      validacao: params.validacao || undefined,
      retry: params.retry,
      error: params.error,
      lastCommandId: params.commandId,
      codigoProfissional: params.profissionalCodigo || undefined,
      emailSent: false,
    };
  }

  private async notifyBackendAsoUpdated(params: {
    schedulingId: string;
    commandId: string;
    status: 'LIBERADO' | 'PENDENTE' | 'FALHA';
    url?: string;
    validacao?: string;
    signature?: any;
    error?: string;
    retry?: {
      pending: boolean;
      count: number;
      nextRetryAt?: Date;
    };
  }) {
    await this.postInternalCallback('/internal/aso/result', {
      schedulingId: params.schedulingId,
      commandId: params.commandId,
      status: params.status,
      url: params.url,
      validacao: params.validacao,
      signature: params.signature,
      updatedAt: new Date(),
      error: params.error,
      retry: params.retry,
    });

    this.logger.log(
      `[${this.queueName}] Callback interno enviado para backend | schedulingId=${params.schedulingId} | status=${params.status} | commandId=${params.commandId}`,
    );
  }
}
