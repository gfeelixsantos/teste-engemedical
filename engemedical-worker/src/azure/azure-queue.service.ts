import { Injectable, Logger } from '@nestjs/common';
import { QueueClient, QueueServiceClient } from '@azure/storage-queue';
import { AsoQueueMessage } from './types/aso.types';
import { UploadSocged } from './types/azure.types';

@Injectable()
export class AzureQueueService {
  private readonly logger = new Logger(AzureQueueService.name);
  private readonly queueServiceClient?: QueueServiceClient;
  private readonly queueName = 'aso-processing';
  private readonly enrichmentQueueName =
    process.env.AZURE_QUEUE_ASO_ENRIQUECIMENTO || 'aso-enriquecimento';
  private readonly socgedQueueName = process.env.AZURE_QUEUE_SOCGED || 'socged';
  private readonly emailQueueName = process.env.AZURE_QUEUE_EMAIL || 'email';

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      this.logger.warn('Azure Queue não configurado; operação em modo degradado.');
      return;
    }
    this.queueServiceClient =
      QueueServiceClient.fromConnectionString(connectionString);
  }

  private requireQueueServiceClient(): QueueServiceClient {
    if (!this.queueServiceClient) {
      throw new Error('Azure Queue não configurado: AZURE_STORAGE_CONNECTION_STRING ausente.');
    }
    return this.queueServiceClient;
  }

  async sendAsoMessage(message: AsoQueueMessage): Promise<void> {
    try {
      const queueClient = this.requireQueueServiceClient().getQueueClient(
        this.queueName,
      );

      await queueClient.createIfNotExists();

      const messageBody = JSON.stringify(message);
      await queueClient.sendMessage(messageBody, {
        visibilityTimeout: 300,
        messageTimeToLive: 86400,
      });

      this.logger.log(
        `[ASO] Mensagem enviada para fila ${this.queueName}: schedulingId=${message.schedulingId} action=${message.action}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[ASO] Erro ao enviar mensagem para fila: ${errorMessage}`,
      );
      throw error;
    }
  }

  async sendAsoMessageBatch(messages: AsoQueueMessage[]): Promise<void> {
    for (const message of messages) {
      await this.sendAsoMessage(message);
    }
  }

  async sendSocgedMessage(payload: UploadSocged): Promise<void> {
    try {
      const queueClient = this.requireQueueServiceClient().getQueueClient(
        this.socgedQueueName,
      );
      await queueClient.createIfNotExists();

      const messageBody = JSON.stringify(payload);
      await queueClient.sendMessage(messageBody, {
        visibilityTimeout: 0,
        messageTimeToLive: 86400,
      });

      this.logger.log(
        `[SOCGED] Mensagem enviada para fila ${this.socgedQueueName}: schedulingId=${payload.schedulingId} fileName=${payload.nomeArquivo}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[SOCGED] Erro ao enviar mensagem para fila: ${errorMessage}`,
      );
      throw error;
    }
  }

  async sendEmailMessage(payload: any): Promise<void> {
    try {
      const queueClient = this.requireQueueServiceClient().getQueueClient(
        this.emailQueueName,
      );
      await queueClient.createIfNotExists();

      const messageBody = JSON.stringify(payload);
      await queueClient.sendMessage(messageBody, {
        visibilityTimeout: 0,
        messageTimeToLive: 86400,
      });

      this.logger.log(
        `[EMAIL] Mensagem enviada para fila ${this.emailQueueName} com sucesso`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[EMAIL] Erro ao enviar mensagem para fila: ${errorMessage}`,
      );
      throw error;
    }
  }
}
