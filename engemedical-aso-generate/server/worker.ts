/**
 * =============================================================================
 * ASO Generate Worker - Gerador de Atestado de Saúde Ocupacional
 * =============================================================================
 * 
 * Este worker processa mensagens da fila Azure Queue para geração de ASOs.
 * Fluxo:
 * 1. Recebe mensagem da fila "aso-processing" (fila principal de processamento)
 * 2. Gera PDF do ASO via Puppeteer (acesso ao sistema SOC)
 * 3. Upload do PDF para Azure Blob Storage
 * 4. Reporta status para o backend (fonte de verdade)
 * 5. Envia mensagem para fila de enriquecimento "aso-enriquecimento"
 * 
 * Dependências Externas:
 * - Azure Storage Queue (filas de mensagens)
 * - Azure Blob Storage (armazenamento de PDFs)
 * - Backend interno (orquestração e persistência)
 * - Sistema SOC (geração do PDF via Puppeteer)
 * 
 * Variáveis de Ambiente Necessárias:
 * - AZURE_CONNECTION_STRING_BLOB: String de conexão do Azure Storage
 * - BACKEND_INTERNAL_BASE_URL_DEV/PROD: URL interna do backend
 * - INTERNAL_WORKER_TOKEN: token de autenticação interna
 * =============================================================================
 */

import axios from 'axios';
import { appLogs, LogLevel } from './src/utils/appLogs';
import { processingMessage, closeBrowserInstance, checkHeartbeat } from './src/web/processingMessage';
import { AsoQueueService } from './src/azure/aso-queue.service';
import { AzureBlobService } from './src/azure/azure-blob.service';
import { AsoProcessingMessage, AsoEnriquecimentoMessage } from './src/web/types';
import { CertificateStatus } from './src/CertificateStatus';
import { generateDocumentNameFromPayload } from './src/utils/fileNameGenerator';
import { buildAsoEnriquecimentoMessage } from './src/utils/build-aso-enriquecimento-message';
import { generateBlobFileName, generateBlobPath } from './src/utils/util';
import { getAsoProcessingEligibilityError } from './src/utils/aso-processing-eligibility';
import path from 'node:path';
import fs from 'node:fs';
import { resolveBackendBaseUrl } from './src/utils/runtimeMode';

/**
 * =============================================================================
 * CONFIGURAÇÕES DO WORKER
 * =============================================================================
 */
appLogs.setLevel(LogLevel.INFO);

const LOOP_INTERVAL = 5000;                    // Intervalo entre verificações (ms)
const MAX_SESSION_AGE = 7 * 24 * 60 * 60 * 1000; // Tempo máximo de vida da sessão Puppeteer (7 dias)
const MAX_CONSECUTIVE_ERRORS = 100;             // Erros consecutivos antes de reiniciar sessão
const QUEUE_VISIBILITY_TIMEOUT_SECONDS = Number(
  process.env.ASO_QUEUE_VISIBILITY_TIMEOUT_SECONDS || 900,
);
const QUEUE_VISIBILITY_RENEW_INTERVAL_MS = Number(
  process.env.ASO_QUEUE_VISIBILITY_RENEW_INTERVAL_MS ||
    Math.max(60000, Math.floor((QUEUE_VISIBILITY_TIMEOUT_SECONDS * 1000) / 2)),
);
const HEALTH_LOG_INTERVAL_MS = Number(
  process.env.ASO_WORKER_HEALTH_LOG_INTERVAL_MS || 60000,
);
// Tempo de espera antes do retry após falha transitória (padrão: 2 minutos)
const RETRY_DELAY_MS = Number(process.env.ASO_RETRY_DELAY_MS || 120000);

/**
 * =============================================================================
 * ESTADO DO WORKER (Métricas e Saúde)
 * =============================================================================
 */
let isRunning = false;
let sessionStartTime = Date.now();
let consecutiveErrors = 0;
let totalProcessed = 0;
let totalErrors = 0;
let totalPolls = 0;
let emptyPolls = 0;
let totalMessagesReceived = 0;
let lastProcessedAt: number | null = null;
let queueService: AsoQueueService | null = null;
let blobService: any = null;
let workerStartTime = Date.now();

/**
 * =============================================================================
 * FUNÇÕES DE LOG E MONITORAMENTO
 * =============================================================================
 */

// Cores ANSI para logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const typeColors = {
  info: colors.cyan,
  error: colors.red,
  success: colors.green,
  warn: colors.yellow,
};

/**
 * Log formatador com timestamp e cores para melhor rastreamento
 */
function log(message: string, type: 'info' | 'error' | 'success' | 'warn' = 'info'): void {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '[INFO]',
    error: '[ERROR]',
    success: '[OK] ',
    warn: '[WARN]'
  };

  const color = typeColors[type] || colors.white;
  const formattedMessage = `${prefix[type]} ${timestamp} - ${message}`;
  
  switch (type) {
    case 'error':
      appLogs.error(formattedMessage);
      break;
    case 'warn':
      appLogs.warn(formattedMessage);
      break;
    case 'success':
    case 'info':
    default:
      appLogs.info(formattedMessage);
  }
}

/**
 * Log de saúde do worker - mostra métricas atuais
 */
function logHealthMetrics(): void {
  const uptime = Math.floor((Date.now() - workerStartTime) / 1000);
  const sessionUptime = Math.floor((Date.now() - sessionStartTime) / 1000);
  const lastProcessedAgoSec = lastProcessedAt
    ? Math.floor((Date.now() - lastProcessedAt) / 1000)
    : null;

  log(`Métricas: Processados=${totalProcessed} | Erros=${totalErrors} | ` +
    `Polls=${totalPolls} | Vazio=${emptyPolls} | Recebidas=${totalMessagesReceived} | ` +
    `UltimoProc=${lastProcessedAgoSec ?? 'n/d'}s | ` +
    `Uptime=${uptime}s | Sessão=${sessionUptime}s | ` +
    `ErrosConsec=${consecutiveErrors}`, 'info');
}

async function logQueueHealth(): Promise<void> {
  try {
    let approximateMessagesCount = 'n/d';
    if (queueService?.getProcessingQueueStats) {
      const stats = await queueService.getProcessingQueueStats();
      approximateMessagesCount = String(stats?.approximateMessagesCount ?? 0);
    }

    log(
      `Fila aso-processing | approx=${approximateMessagesCount} | polls=${totalPolls} | emptyPolls=${emptyPolls} | recebidas=${totalMessagesReceived} | processados=${totalProcessed} | erros=${totalErrors}`,
      'info',
    );
  } catch (error) {
    log(`Falha ao coletar saude da fila: ${error}`, 'warn');
  }
}

/**
 * =============================================================================
 * FUNÇÕES DE PROCESSAMENTO
 * =============================================================================
 */

/**
 * Verifica o status atual do ASO no backend antes de processar.
 * Retorna o status ASOINFO ou null se não conseguir verificar.
 */
async function checkAsoStatus(schedulingId: string): Promise<string | null> {
  const { baseURL } = resolveBackendBaseUrl();
  const token = process.env.INTERNAL_WORKER_TOKEN;

  if (!baseURL || !token) {
    log('BACKEND_INTERNAL_BASE_URL ou INTERNAL_WORKER_TOKEN não configurado. Pulando verificação.', 'warn');
    return null;
  }

  try {
    const response = await axios.get(`${baseURL.replace(/\/+$/, '')}/internal/aso/${schedulingId}/status`, {
      headers: {
        'x-internal-token': token,
      },
      timeout: 10000,
    });
    return response.data?.ASOINFO?.status || null;
  } catch (error) {
    log(`Erro ao verificar status do ASO ${schedulingId}: ${error}`, 'warn');
    return null;
  }
}

async function sendBackendCallback(payload: any) {
  const { baseURL, environmentLabel } = resolveBackendBaseUrl();
  const token = process.env.INTERNAL_WORKER_TOKEN;

  if (!baseURL || !token) {
    log('BACKEND_INTERNAL_BASE_URL ou INTERNAL_WORKER_TOKEN não configurado. Ignorando callback.', 'warn');
    return;
  }

  log(`Usando backend URL: ${baseURL} (${environmentLabel})`, 'info');

  const eventType =
    payload?.status === 'LIBERADO' || payload?.status === 'FALHA'
      ? 'ASO_ENRICHMENT_UPDATED'
      : 'ASO_PROCESSING_UPDATED';

  const callbackBody = {
    ...payload,
    schemaVersion: '1.0',
    eventType,
    producer: 'cmso360-aso-generate',
    producedAt: new Date().toISOString(),
    payload: {
      ...payload,
    },
  };

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const fullUrl = `${baseURL.replace(/\/+$/, '')}/internal/aso/result`;
      await axios.post(fullUrl, callbackBody, {
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': token,
          'x-correlation-id': payload?.schedulingId || '',
        },
        timeout: 10000,
      });
      log(
        `Callback enviado para ${payload.schedulingId} (status: ${payload.status}) [${attempt}/${maxAttempts}]`,
        'info',
      );
      return;
    } catch (error: any) {
      const status = error?.response?.status;
      const retryable = !status || status >= 500 || status === 429;
      const delayMs = Math.min(30000, 1000 * Math.pow(2, attempt - 1));

      log(
        `Falha callback [${attempt}/${maxAttempts}] status=${status ?? 'n/a'} retryable=${retryable} erro=${error?.message}`,
        'warn',
      );

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Atualiza status do ASO via callback interno para o Backend (fonte de verdade)
 */
async function updateAsoStatus(
  schedulingId: string,
  status: string,
  additionalFields: Record<string, any> = {}
): Promise<void> {
  log(`Reportando status ${status} para ${schedulingId}`, 'info');

  await sendBackendCallback({
    schedulingId,
    status,
    ...additionalFields,
    updatedAt: new Date(),
  });
}

/**
 * Atualiza status do ASO com URL do PDF gerado.
 *
 * O documento ainda segue para enriquecimento e assinatura digital,
 * entao o backend deve manter o ASO em processamento neste momento.
 * 
 * @param schedulingId - ID do agendamento
 * @param blobUrl - URL do PDF no Blob Storage
 */
async function updateAsoStatusWithGeneratedUrl(
  schedulingId: string,
  blobUrl: string,
  commandId?: string,
): Promise<void> {
  log(`Reportando ASO DIGITALIZADA para ${schedulingId} com URL gerada`, 'info');

  await sendBackendCallback({
    commandId,
    schedulingId,
    status: 'DIGITALIZADA',
    url: blobUrl,
    updatedAt: new Date(),
  });
}

function validateProcessingMessagePayload(item: AsoProcessingMessage): string[] {
  return [
    ['schedulingId', item.schedulingId],
    ['codEmpresa', item.codEmpresa],
    ['codFuncionario', item.codFuncionario],
    ['sequencial', item.sequencial],
    ['medico', item.medico],
  ]
    .filter(([, value]) => !String(value || '').trim())
    .map(([field]) => field);
}

async function withMessageVisibilityRenewal<T>(
  message: any,
  operation: () => Promise<T>,
): Promise<{ result: T; popReceipt: string }> {
  if (!queueService) {
    return {
      result: await operation(),
      popReceipt: message.popReceipt,
    };
  }

  let active = true;
  let currentPopReceipt = message.popReceipt;

  const timer = setInterval(async () => {
    if (!active || !queueService) {
      return;
    }

    try {
      currentPopReceipt = await (queueService as any).renewProcessingMessage(
        message.messageId,
        currentPopReceipt,
        message.messageText,
      );
      log(`Visibility renovada para mensagem ${message.messageId}`, 'info');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log(
        `Falha ao renovar visibility da mensagem ${message.messageId}: ${errorMessage}`,
        'warn',
      );
    }
  }, QUEUE_VISIBILITY_RENEW_INTERVAL_MS);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  try {
    const result = await operation();
    return { result, popReceipt: currentPopReceipt };
  } finally {
    active = false;
    clearInterval(timer);
  }
}

/**
 * Parse da mensagem da fila - aceita apenas JSON puro
 * @returns payload parseado
 * @throws Error se mensagem for inválida
 */
function parseQueueMessage(messageText: string): any {
  const raw = String(messageText || '').trim();

  try {
    return JSON.parse(raw);
  } catch (parseError) {
    throw new Error(`Mensagem inválida na fila: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }
}

/**
 * Mapeia a mensagem da fila para o formato AsoProcessingMessage
 * 
 * A mensagem contém os dados necessários para geração do ASO:
 * - dados do funcionário (nome, CPF)
 * - dados da empresa
 * - dados do exame
 * 
 * @param payload - Dados da mensagem da fila
 * @returns AsoProcessingMessage no formato esperado pelo certificateGenerator
 */
function mapMessageToCertificate(payload: any): AsoProcessingMessage {
  appLogs.debug(`mapMessageToCertificate - medico from payload: "${payload.medico}" | schedulingId: ${payload.schedulingId}`);

  return {
    ...payload,                                 // Preserva todos os campos originais (credenciais, etc)
    status: CertificateStatus.Pendente,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    socgedCode: payload.socgedCode || '',       // Garante valor default
    observacoes: payload.observacoes || [],    // Garante valor default
  };
}

/**
 * Processa uma mensagem da fila - função principal de processamento
 * 
 * Fluxo de processamento:
 * 1. Parse da mensagem JSON (status inicial: PENDENTE)
 * 2. Geração do PDF via Puppeteer
 * 3. Upload para Blob Storage
 * 4. Atualização status -> DIGITALIZADA (com URL do PDF)
 * 5. Envio para fila de enriquecimento
 * 
 * @param message - Mensagem da fila Azure
 * @param blobService - Serviço de upload Azure Blob
 */
/**
 * Resultado do processamento da mensagem
 */
interface ProcessResult {
  success: boolean;
  shouldDelete: boolean;
  error?: string;
}

function getPermanentSocSoapFaultMessage(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error || '');

  if (!message.includes('SOC SOAP Fault: ')) {
    return null;
  }

  const faultIndex = message.indexOf('SOC SOAP Fault:');
  const fault = message.substring(faultIndex).replace(/^SOC SOAP Fault:\s*/i, '').trim();
  const normalized = fault.toLowerCase();
  const mentionsFichaClinica =
    normalized.includes('ficha') &&
    normalized.includes('clin') &&
    normalized.includes('encontr');
  const mentionsEmissorNaoEncontrado =
    normalized.includes('emissor de aso') && normalized.includes('encontr');
  const mentionsCodigoPessoaNaoNumerico =
    normalized.includes('pessoa deve ser') && normalized.includes('numer');

  if (
    normalized.includes('ficha clínica não encontrada') ||
    normalized.includes('ficha clinica nao encontrada') ||
    mentionsFichaClinica ||
    normalized.includes('código emissor de aso não encontrado') ||
    normalized.includes('codigo emissor de aso nao encontrado') ||
    mentionsEmissorNaoEncontrado ||
    normalized.includes('código da pessoa deve ser numérico') ||
    normalized.includes('codigo da pessoa deve ser numerico') ||
    mentionsCodigoPessoaNaoNumerico
  ) {
    return fault;
  }

  return null;
}

async function processMessage(message: any, blobService: any): Promise<ProcessResult | undefined> {
  let payload: any;
  const dequeueCount = message.dequeueCount || 0;


  // Parse da mensagem com tratamento de erro
  try {
    payload = parseQueueMessage(message.messageText);
  } catch (parseError: any) {
    const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
    log(`Mensagem inválida na fila: ${errorMsg}. Será removida.`, 'error');
    // Retorna para deleção - mensagem inválida não deve ficar na fila
    return { success: false, shouldDelete: true, error: errorMsg };
  }

  const item = mapMessageToCertificate(payload);
  const startTime = Date.now();

  log(`[schedulingId=${item.schedulingId}] Iniciando: ${item.nomeFuncionario} (${item.tipoExameNome}) | dequeueCount=${dequeueCount}`, 'info');

  try {
    const missingFields = validateProcessingMessagePayload(item);
    if (missingFields.length > 0) {
      throw new Error(
        `Payload invalido para ASO processing: campos obrigatorios ausentes (${missingFields.join(', ')})`,
      );
    }

    const eligibilityError = getAsoProcessingEligibilityError({
      schedulingId: item.schedulingId,
      sequencial: item.sequencial,
      codEmpresa: item.codEmpresa,
      codFuncionario: item.codFuncionario,
      medico: item.medico,
    });
    if (eligibilityError) {
      throw new Error(eligibilityError);
    }

    // Verificação de idempotência: verificar se ASO já foi processado
    const currentStatus = await checkAsoStatus(item.schedulingId);
    if (
      currentStatus &&
      ['GERADO', 'DIGITALIZADA', 'ASSINADO', 'LIBERADO'].includes(
        currentStatus,
      )
    ) {
      log(`ASO já processado (status=${currentStatus}). Pulando geração para schedulingId=${item.schedulingId}`, 'warn');
      return { success: true, shouldDelete: true }; // Deleta mensagem - ASO já foi processado
    }


    // 1. Gera certificado via Puppeteer
    log(`[schedulingId=${item.schedulingId}] Gerando PDF para ${item.nomeFuncionario}...`, 'info');

    await processingMessage([item], true);

    log(`PDF gerado com sucesso`, 'success');

    // 3. Upload para Azure Blob Storage
    // O processingMessage salva em temp com schedulingId.pdf
    const documentName = generateDocumentNameFromPayload(item.schedulingId);
    const tempPath = path.join(process.cwd(), 'temp', documentName);
    if (!fs.existsSync(tempPath)) {
      throw new Error(
        `Arquivo PDF temporario nao encontrado apos geracao: ${tempPath}`,
      );
    }

    // Gera nome padronizado para ASO inicial (não assinado ainda)
    const uploadDate = new Date();
    const finalFileName = generateBlobFileName({
      type: 'ASO',
      empresaCode: item.codEmpresa,
      funcionarioName: item.nomeFuncionario,
      documentType: item.tipoExameNome,
      date: uploadDate,
    });

    // Gera path completo
    const blobPath = generateBlobPath({
      fileType: 'aso',
      empresaCode: item.codEmpresa,
      prontuario: item.prontuario || item.schedulingId,
      fileName: finalFileName,
      date: uploadDate,
    });

    let blobUrl = blobPath;
    try {
      blobUrl = await blobService.uploadFile(blobPath, tempPath);
      log(`Upload Blob concluído: ${blobUrl}`, 'success');

      // Remove arquivo local após upload
      try {
        fs.unlinkSync(tempPath);
        log(`Arquivo temporário removido: ${tempPath}`, 'info');
      } catch (unlinkErr) {
        log(`Aviso: não foi possível remover arquivo temporário: ${unlinkErr}`, 'warn');
      }
    } catch (blobError) {
      log(`Erro no upload Blob: ${blobError}`, 'error');
      throw blobError;  // Lança erro para impedir deleção da mensagem
    }

    // 4. Atualiza status para DIGITALIZADA com URL do PDF
    await updateAsoStatusWithGeneratedUrl(
      item.schedulingId,
      blobUrl,
      item.commandId,
    );
    log(`Status atualizado: DIGITALIZADA (aguardando enriquecimento)`, 'success');

    // 5. Envia para fila de enriquecimento (assinatura digital, email, Google Drive)
    const enriquecimentoMessage: AsoEnriquecimentoMessage =
      buildAsoEnriquecimentoMessage({
        item,
        blobUrl,
      });

    await queueService!.sendToEnriquecimento(enriquecimentoMessage);
    log(`Mensagem enviada para fila de enriquecimento`, 'info');

    // Métricas
    const duration = Date.now() - startTime;
    totalProcessed++;
    consecutiveErrors = 0;
    log(`Processamento concluído em ${duration}ms`, 'success');

    // Sucesso - pode deletar mensagem
    return { success: true, shouldDelete: true };

  } catch (error) {
    consecutiveErrors++;
    totalErrors++;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const permanentSocSoapFault = getPermanentSocSoapFaultMessage(error);
    const isInvalidPayload = errorMessage.includes('Payload invalido');
    const isExhausted = dequeueCount >= 5;
    
    const isPermanentError = permanentSocSoapFault || isInvalidPayload || isExhausted;
    
    log(`Erro no processamento: ${errorMessage}`, 'error');

    // Atualiza status para FALHA com informações de retry
    await updateAsoStatus(item.schedulingId, 'FALHA', {
      commandId: item.commandId,
      error: errorMessage,
      retry: {
        pending: !isPermanentError,
        count: dequeueCount,
        nextRetryAt: isPermanentError
          ? null
          : new Date(Date.now() + RETRY_DELAY_MS), // configurável via ASO_RETRY_DELAY_MS (padrão: 5 min)
      },
    });

    // Erro no processamento - não deleta mensagem (vai para retry)
    if (isPermanentError) {
      log(
        `Falha definitiva ou limite excedido detectado para ${item.schedulingId}. Mensagem sera removida da fila.`,
        'warn',
      );
      return { success: false, shouldDelete: true, error: errorMessage };
    }

    return { success: false, shouldDelete: false, error: errorMessage };
  }
}

/**
 * =============================================================================
 * LOOP PRINCIPAL DO WORKER
 * =============================================================================
 */

/**
 * Executa uma iteração do worker
 * 
 * Fluxo:
 * 1. Inicializa serviços Azure (se necessário)
 * 2. Verifica mensagens na fila
 * 3. Processa mensagens encontradas
 * 4. Reinicia sessão Puppeteer se necessário (manutenção)
 */
async function executeWorker(): Promise<void> {
  if (isRunning) {
    log('Execucao anterior em andamento, pulando...', 'warn');
    return;
  }

  isRunning = true;

  try {
    totalPolls++;

    // Inicializa serviços Azure
    const azureConnectionString = process.env.AZURE_CONNECTION_STRING_BLOB;
    if (!azureConnectionString) {
      throw new Error('AZURE_CONNECTION_STRING_BLOB nao configurado');
    }

    if (!queueService) {
      queueService = new AsoQueueService(azureConnectionString);
      await queueService.initialize();
      appLogs.info("Azure Queue Service conectado");
    }

    if (!blobService) {
      blobService = new AzureBlobService(azureConnectionString);
      await blobService.initialize();
      appLogs.info("Azure Blob Service conectado");
    }

    // Verifica mensagens na fila
    const messages = await queueService.receiveProcessingMessage();

    // Sempre verifica o heartbeat independente se há mensagens (evita queda se a fila estiver presa em erro)
    await checkHeartbeat();

    if (!messages || messages.length === 0) {
      consecutiveErrors = 0;
      emptyPolls++;
      return;
    }

    totalMessagesReceived += messages.length;
    appLogs.info(`${messages.length} mensagem(ns) na fila para processar`);

    // Verifica necessidade de reiniciar sessão Puppeteer
    // Sessões longas podem ter problemas, então reiniciamos periodicamente
    const sessionAge = Date.now() - sessionStartTime;
    const shouldRestartSession = sessionAge > MAX_SESSION_AGE || consecutiveErrors >= MAX_CONSECUTIVE_ERRORS;

    if (shouldRestartSession) {
      const reason = consecutiveErrors >= MAX_CONSECUTIVE_ERRORS
        ? 'Maximo de erros consecutivos'
        : 'Sessao expirou';
      appLogs.warn(`Reiniciando sessao Puppeteer (${reason})...`);
      await closeBrowserInstance();
      sessionStartTime = Date.now();
      consecutiveErrors = 0;
      appLogs.info("Sessao Puppeteer reiniciada");
    }

    // Processa cada mensagem
    for (const message of messages) {
      let currentPopReceipt = message.popReceipt;
      let shouldDeleteMessage = false;
      
      try {
        const execution = await withMessageVisibilityRenewal(
          message,
          async () => processMessage(message, blobService),
        );
        currentPopReceipt = execution.popReceipt;
        
        // Verifica se deve deletar a mensagem
        const result = execution.result as ProcessResult | undefined;
        shouldDeleteMessage = result?.shouldDelete ?? true; // Se undefined, assume que deve deletar
        
        if (shouldDeleteMessage) {
          lastProcessedAt = Date.now();
          await queueService.deleteProcessingMessage(
            message.messageId,
            currentPopReceipt,
          );
        } else {
          // Mensagem inválida ou erro - não deleta, deixa para retry
          log(`Mensagem ${message.messageId} retida na fila para retry`, 'warn');
        }
      } catch (error) {
        log(`Erro inesperado ao processar mensagem ${message.messageId}: ${error}`, 'error');
        appLogs.warn(`Mensagem ${message.messageId} retida na fila para retry`);
      }
    }

    // Log de métricas a cada iteração com mensagens
    logHealthMetrics();

  } catch (error) {
    consecutiveErrors++;
    log(`Erro no worker: ${error}`, 'error');

    // Se muitos erros consecutivos, reinicia sessão
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      log('Reiniciando sessão após muitos erros...', 'warn');
      await closeBrowserInstance();
      sessionStartTime = Date.now();
      consecutiveErrors = 0;
    }
  } finally {
    isRunning = false;
    // Agenda próxima execução
    setTimeout(executeWorker, LOOP_INTERVAL);
  }
}

/**
 * =============================================================================
 * INICIALIZAÇÃO E GRACEFUL SHUTDOWN
 * =============================================================================
 */

/**
 * Inicia o worker
 */
function startLoop(): void {
  log('========================================', 'info');
  log('ASO Generate Worker iniciado', 'info');
  log(`Intervalo: ${LOOP_INTERVAL}ms`, 'info');
  log(`Max Session Age: ${MAX_SESSION_AGE}ms`, 'info');
  log(`Max Consecutive Errors: ${MAX_CONSECUTIVE_ERRORS}`, 'info');
  log(`Health Log Interval: ${HEALTH_LOG_INTERVAL_MS}ms`, 'info');
  log('========================================', 'info');
  setInterval(() => {
    void logQueueHealth();
  }, HEALTH_LOG_INTERVAL_MS);
  executeWorker();
}

// Graceful Shutdown - Tratamento de sinais do sistema
// Garante que o browser seja fechado corretamente ao parar o worker
process.on('SIGINT', async () => {
  log('Recebido SIGINT, encerrando...', 'warn');
  await closeBrowserInstance();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('Recebido SIGTERM, encerrando...', 'warn');
  await closeBrowserInstance();
  process.exit(0);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  log(`Erro não capturado: ${error.message}`, 'error');
  log(error.stack || '', 'error');
});

process.on('unhandledRejection', (reason) => {
  log(`Rejeição não tratada: ${reason}`, 'error');
});

// Inicia o worker
startLoop();
