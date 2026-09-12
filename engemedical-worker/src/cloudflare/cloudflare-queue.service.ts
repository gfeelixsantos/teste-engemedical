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
      const response = await fetch(
        `${this.baseUrl}/messages/pull?batch_size=${batchSize}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            visibility_timeout: 300, // 5 minutos para processar
          }),
        },
      );

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
          },
        },
      );

      if (!response.ok) {
        this.logger.error(
          `[CF_QUEUE] Erro ao fazer ack da mensagem ${messageId}: ${response.status}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `[CF_QUEUE] Falha ao fazer ack: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Rejeita uma mensagem (nack) - volta para a fila
   */
  async nack(messageId: string): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const response = await fetch(
        `${this.baseUrl}/messages/${messageId}/nack`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        },
      );

      if (!response.ok) {
        this.logger.error(
          `[CF_QUEUE] Erro ao fazer nack da mensagem ${messageId}: ${response.status}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `[CF_QUEUE] Falha ao fazer nack: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Envia mensagem para a fila (usado pelo backend)
   * Este método é opcional - o backend já tem sua própria implementação
   */
  async send(payload: SendEmailPayload): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('[CF_QUEUE] Serviço não configurado - envio ignorado');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: JSON.stringify(payload),
        }),
      });

      if (!response.ok) {
        this.logger.error(
          `[CF_QUEUE] Erro ao enviar mensagem: ${response.status} ${response.statusText}`,
        );
        return false;
      }

      this.logger.log('[CF_QUEUE] Mensagem enviada para a fila com sucesso');
      return true;
    } catch (error) {
      this.logger.error(
        `[CF_QUEUE] Falha ao enviar mensagem: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
