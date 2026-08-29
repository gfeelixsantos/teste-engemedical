/**
 * =============================================================================
 * Azure Queue Service - Serviço de Filas do Azure Storage
 * =============================================================================
 * 
 * Este serviço gerencia as filas de mensagens para processamento de ASOs.
 * 
 * Filas utilizadas:
 * 1. aso-processing - Fila principal de processamento
 *    - Recebe mensagens do backend quando um ASO é agendado
 *    - Worker processa estas mensagens para gerar o PDF
 * 
 * 2. aso-enriquecimento - Fila de enriquecimento pós-geração
 *    - Recebe mensagens após geração do PDF
 *    - Worker de enriquecimento processa: assinatura digital, email, Google Drive
 * 
 * Formato das mensagens:
 * {
 *   schedulingId: string,    // ID do agendamento no MongoDB
 *   nomeFuncionario: string,  // Nome do funcionário
 *   nomeEmpresa: string,      // Nome da empresa
 *   tipoExame: string,       // Tipo de exame
 *   cpfFuncionario: string,  // CPF do funcionário
 *   codEmpresa: string,      // Código da empresa no sistema SOC
 *   codFuncionario: string, // Código do funcionário no sistema SOC
 *   sequencial: string,     // Sequencial da ficha
 *   dataFicha: string,      // Data da ficha
 *   parecer: string,        // Parecer médico
 *   observacoes: string[],  // Observações
 *   createdAt: string       // Timestamp de criação
 * }
 * 
 * Visibilidade:
 * - Tempo de visibilidade: 300 segundos (5 minutos)
 * - Tempo de vida: 86400 segundos (24 horas)
 * 
 * Referência: https://docs.microsoft.com/en-us/azure/storage/queues/
 * =============================================================================
 */

import { QueueServiceClient } from '@azure/storage-queue';

const DEFAULT_VISIBILITY_TIMEOUT_SECONDS = Number(
  process.env.ASO_QUEUE_VISIBILITY_TIMEOUT_SECONDS || 900,
);
const DEFAULT_SEND_VISIBILITY_TIMEOUT_SECONDS = Number(
  process.env.ASO_QUEUE_SEND_VISIBILITY_TIMEOUT_SECONDS || 0,
);
const DEFAULT_MESSAGE_TTL_SECONDS = Number(
  process.env.ASO_QUEUE_MESSAGE_TTL_SECONDS || 86400,
);

/**
 * Nome das filas utilizadas no Azure Storage
 */
export const QUEUE_PROCESSING =
  process.env.AZURE_QUEUE_ASO_PROCESSING || 'aso-processing';
export const QUEUE_ENRIQUECIMENTO =
  process.env.AZURE_QUEUE_ASO_ENRIQUECIMENTO || 'aso-enriquecimento';

/**
 * =============================================================================
 * AsoQueueService
 * =============================================================================
 * Gerencia as operações com filas do Azure Storage
 */
class AsoQueueService {
  /**
   * Construtor
   * @param {string} connectionString - String de conexão do Azure Storage
   */
  constructor(connectionString) {
    if (!connectionString) {
      throw new Error('AZURE_CONNECTION_STRING_BLOB não configurado');
    }
    this.queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
    
    // Clientes para cada fila
    this.processingQueueClient = this.queueServiceClient.getQueueClient(QUEUE_PROCESSING);
    this.enriquecimentoQueueClient = this.queueServiceClient.getQueueClient(QUEUE_ENRIQUECIMENTO);
  }

  /**
   * Inicializa as filas - cria se não existirem
   * Chamado uma vez na inicialização do worker
   */
  async initialize() {
    await this.processingQueueClient.createIfNotExists();
    await this.enriquecimentoQueueClient.createIfNotExists();
    console.log('[ASO] Filas Azure inicializadas');
  }

  /**
   * Recebe mensagens de uma fila específica
   * @param {Object} queueClient - Cliente da fila
   * @param {number} maxMessages - Número máximo de mensagens para receber
   * @returns {Promise<Array>} Array de mensagens recebidas
   */
  async receiveMessage(queueClient, maxMessages = 1) {
    const response = await queueClient.receiveMessages({
      numberOfMessages: maxMessages,
      visibilityTimeout: DEFAULT_VISIBILITY_TIMEOUT_SECONDS,
    });
    return response.receivedMessageItems || [];
  }

  /**
   * Recebe mensagens da fila de processamento
   * @returns {Promise<Array>} Mensagens da fila aso-processing
   */
  async receiveProcessingMessage() {
    return this.receiveMessage(this.processingQueueClient);
  }

  async getProcessingQueueStats() {
    const properties = await this.processingQueueClient.getProperties();
    return {
      approximateMessagesCount: Number(
        properties?.approximateMessagesCount || 0,
      ),
    };
  }

  /**
   * Deleta uma mensagem da fila após processamento
   * @param {Object} queueClient - Cliente da fila
   * @param {string} messageId - ID da mensagem
   * @param {string} popReceipt - Receipt para confirmação de delete
   */
  async deleteMessage(queueClient, messageId, popReceipt) {
    await queueClient.deleteMessage(messageId, popReceipt);
  }

  /**
   * Deleta mensagem da fila de processamento
   * @param {string} messageId - ID da mensagem
   * @param {string} popReceipt - Receipt para confirmação
   */
  async deleteProcessingMessage(messageId, popReceipt) {
    return this.deleteMessage(this.processingQueueClient, messageId, popReceipt);
  }

  /**
   * Renova a invisibilidade de uma mensagem em processamento.
   * O popReceipt retornado precisa ser reutilizado nas próximas operações.
   */
  async renewProcessingMessage(messageId, popReceipt, messageText) {
    const response = await this.processingQueueClient.updateMessage(
      messageId,
      popReceipt,
      messageText,
      DEFAULT_VISIBILITY_TIMEOUT_SECONDS,
    );

    return response?.popReceipt || popReceipt;
  }

  /**
   * Envia mensagem para uma fila específica
   * @param {string} queueName - Nome da fila de destino
   * @param {Object} message - Dados da mensagem
   */
  async sendAsoMessage(queueName, message) {
    try {
      const queueClient = queueName === QUEUE_PROCESSING 
        ? this.processingQueueClient 
        : this.enriquecimentoQueueClient;
      
      // Adiciona timestamp de criação
      const messageBody = JSON.stringify({
        ...message,
        createdAt: new Date().toISOString(),
      });
      
      // Configurações de visibilidade e TTL
      await queueClient.sendMessage(messageBody, {
        visibilityTimeout: DEFAULT_SEND_VISIBILITY_TIMEOUT_SECONDS,
        messageTimeToLive: DEFAULT_MESSAGE_TTL_SECONDS,
      });

      console.log(
        `[ASO] Mensagem enviada para fila ${queueName}: schedulingId=${message.schedulingId}`,
      );
    } catch (error) {
      const errorMessage = error.message || String(error);
      console.error(
        `[ASO] Erro ao enviar mensagem para fila ${queueName}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Envia mensagem para fila de enriquecimento
   * Usado após geração do PDF para processar:
   * - Assinatura digital
   * - Envio de email
   * - Upload para Google Drive
   * 
   * @param {Object} message - Dados para enriquecimento
   */
  async sendToEnriquecimento(message) {
    return this.sendAsoMessage(QUEUE_ENRIQUECIMENTO, message);
  }

}

export { AsoQueueService, QUEUE_PROCESSING, QUEUE_ENRIQUECIMENTO };
