import { Injectable, Logger } from '@nestjs/common';

type CloudflareQueueMessage = {
  id: string;
  body: string;
  receivedAt: string;
};

type SendEmailPayload = {
  to: string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
};

/**
 * Serviço para consumir filas Cloudflare Queue via REST API.
 * Mantém nomenclatura consistente com engemedical-backend.
 */
@Injectable()
export class CloudflareQueueService {
  private readonly logger = new Logger(CloudflareQueueService.name);
  private readonly accountId: string;
  private readonly queueName: string;
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.queueName = process.env.CLOUDFLARE_QUEUE_NAME || 'email-service';
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/queues/${this.queueName}`;
  }

  /**
   * Verifica se o serviço está configurado
   */
  isConfigured(): boolean {
    return !!(this.accountId && this.apiToken && this.queueName);
  }

  /**
   * Consome mensagens da fila (batch)
   * Retorna array de mensagens ou vazio se fila estiver vazia
   */
  async consume(batchSize: number = 10): Promise<CloudflareQueueMessage[]> {
    if (!this.isConfigured()) {
      this.logger.warn('[CF_QUEUE] Serviço não configurado - pulando consumo');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages/pull`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visibility_timeout_ms: 300000, // 5 minutos (300s)
          batch_size: batchSize,
        }),
      });

      if (!response.ok) {
        this.logger.error(
          `[CF_QUEUE] Erro ao consumir fila: ${response.status} ${response.statusText}`,
        );
        return [];
      }

      const data = (await response.json()) as any;
      const messages: CloudflareQueueMessage[] = data.result?.messages || [];

      if (messages.length > 0) {
        this.logger.log(
          `[CF_QUEUE] ${messages.length} mensagem(ns) consumida(s) da fila "${this.queueName}"`,
        );
      }

      return messages;
    } catch (error) {
      this.logger.error(
        `[CF_QUEUE] Falha ao consumir fila: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Confirma processamento de uma mensagem (ack)
   */
  async ack(messageId: string): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const response = await fetch(
        `${this.baseUrl}/messages/${messageId}/ack`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
      );

      return response.ok;
    } catch (error) {
      this.logger.error(`[CF_QUEUE] Falha no ack: ${error}`);
      return false;
    }
  }

  /**
   * Marca mensagem para retry
   */
  async retry(messageId: string): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const response = await fetch(
        `${this.baseUrl}/messages/${messageId}/retry`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
      );

      return response.ok;
    } catch (error) {
      this.logger.error(`[CF_QUEUE] Falha no retry: ${error}`);
      return false;
    }
  }
}