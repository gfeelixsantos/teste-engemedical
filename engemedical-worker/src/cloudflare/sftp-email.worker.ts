import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CloudflareQueueService } from './cloudflare-queue.service';
import { EmailService } from '../nodemailer/nodemailer.service';
import { TemplateNames } from '../nodemailer/types/emailtype';

type QueuedEmail = {
  to: string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded
    contentType: string;
  }>;
};

/**
 * Worker que consome mensagens da fila Cloudflare Queue "email-service"
 * e envia emails via Nodemailer (SMTP).
 *
 * Mantém nomenclatura consistente com engemedical-backend.
 */
@Injectable()
export class SftpEmailWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SftpEmailWorker.name);
  private pollingTimer: NodeJS.Timeout | null = null;
  private isPolling = false;
  private isRunning = false;

  // Configurações
  private readonly POLL_INTERVAL_MS = 10_000; // 10 segundos
  private readonly BATCH_SIZE = 5;
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly queueService: CloudflareQueueService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    const enabled = process.env.SFTP_EMAIL_WORKER_ENABLED !== 'false';

    if (!enabled) {
      this.logger.log('[SFTP_EMAIL_WORKER] Desabilitado via env var');
      return;
    }

    if (!this.queueService.isConfigured()) {
      this.logger.warn(
        '[SFTP_EMAIL_WORKER] Cloudflare Queue não configurado - worker inativo',
      );
      return;
    }

    this.logger.log(
      `[SFTP_EMAIL_WORKER] Iniciando polling da fila (intervalo: ${this.POLL_INTERVAL_MS}ms)`,
    );
    this.isRunning = true;
    this.startPolling();
  }

  onModuleDestroy() {
    this.isRunning = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.logger.log('[SFTP_EMAIL_WORKER] Finalizado');
  }

  private startPolling() {
    if (!this.isRunning) return;

    this.pollingTimer = setTimeout(async () => {
      if (!this.isPolling) {
        await this.poll();
      }
      this.startPolling();
    }, this.POLL_INTERVAL_MS);
  }

  private async poll() {
    if (this.isPolling || !this.isRunning) return;

    this.isPolling = true;
    try {
      const messages = await this.queueService.consume(this.BATCH_SIZE);

      for (const message of messages) {
        await this.processMessage(message.id, message.body);
      }
    } catch (error) {
      this.logger.error(
        `[SFTP_EMAIL_WORKER] Erro no polling: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.isPolling = false;
    }
  }

  private async processMessage(messageId: string, body: string, retryCount = 0) {
    try {
      const email: QueuedEmail = JSON.parse(body);

      // Validar payload
      if (!email.to?.length || !email.subject || !email.html) {
        this.logger.error(
          `[SFTP_EMAIL_WORKER] Payload inválido - ignorando mensagem ${messageId}`,
        );
        await this.queueService.ack(messageId);
        return;
      }

      // Preparar attachments (decodificar base64)
      const attachments = (email.attachments || []).map((att) => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType,
      }));

      // Adaptar o contrato da fila ao contrato real do EmailService.
      // O SFTP publica html/attachments; o Nodemailer usa template/attachment.
      await this.emailService.sendEmail({
        to: email.to,
        subject: email.subject,
        template: email.html,
        templatename: TemplateNames.CUSTOM_HTML,
        attachment: attachments,
      });

      // Confirmar processamento
      await this.queueService.ack(messageId);

      this.logger.log(
        `[SFTP_EMAIL_WORKER] Email enviado com sucesso: "${email.subject}" → ${email.to.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `[SFTP_EMAIL_WORKER] Falha ao processar mensagem ${messageId}: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Retry logic
      if (retryCount < this.MAX_RETRIES) {
        this.logger.warn(
          `[SFTP_EMAIL_WORKER] Retry ${retryCount + 1}/${this.MAX_RETRIES} para mensagem ${messageId}`,
        );
        await this.retryMessage(messageId);
      } else {
        this.logger.error(
          `[SFTP_EMAIL_WORKER] Máximo de retries atingido para mensagem ${messageId} - descartando`,
        );
        await this.queueService.ack(messageId);
      }
    }
  }

  private async retryMessage(messageId: string) {
    try {
      await this.queueService.retry(messageId);
    } catch (error) {
      this.logger.error(`[SFTP_EMAIL_WORKER] Falha ao fazer retry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
