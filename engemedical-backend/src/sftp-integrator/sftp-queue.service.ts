import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CloudflareQueueService {
  private readonly logger = new Logger(CloudflareQueueService.name);
  private readonly accountId = process.env.QUEUE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || '';
  private readonly queueName = process.env.QUEUE_NAME || 'email-service';
  private readonly accessToken = process.env.CLOUDFLARE_API_TOKEN || '';

  constructor() {
    if (!this.accessToken) {
      this.logger.warn('[QUEUE] Token nao configurado - email service offline');
    } else {
      this.logger.log(`[QUEUE] Conectado a Cloudflare Queue: ${this.queueName}`);
    }
  }

  /**
   * Envia mensagem para a fila email-service
   */
  async sendEmail(payload: {
    to: string[];
    subject: string;
    template: string;
    templateData: Record<string, any>;
  }): Promise<void> {
    if (!this.accessToken) {
      this.logger.error('[QUEUE] Tentativa de enviar email sem token configurado');
      throw new Error('Queue token nao configurado');
    }

    const authHeader = `Bearer ${this.accessToken}`;
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/queues/${this.queueName}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`[QUEUE] Erro ao enviar mensagem: ${response.status} ${error}`);
      throw new Error(`Queue send failed: ${response.status}`);
    }

    this.logger.debug(`[QUEUE] Mensagem enviada para ${payload.to.join(', ')}`);
  }

  /**
   * Processa mensagens da fila (usado por worker ou cron)
   */
  async receiveMessages(count = 10): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('Queue token nao configurado');
    }

    const authHeader = `Bearer ${this.accessToken}`;
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/queues/${this.queueName}/messages?batch_size=${count}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`Queue receive failed: ${response.status}`);
    }

    const data = await response.json();
    return data.result || [];
  }

  /**
   * Verifica se o servico de queue esta disponivel
   */
  isEnabled(): boolean {
    return !!this.accessToken;
  }
}