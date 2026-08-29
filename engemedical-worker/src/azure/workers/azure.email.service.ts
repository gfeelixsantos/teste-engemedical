// src/workers/azure-pdf.worker.service.ts
import { Injectable } from '@nestjs/common';
import { DequeuedMessageItem } from '@azure/storage-queue';
import { AzureBaseWorker } from '../azure-worker';
import { EmailType } from 'src/nodemailer/types/emailtype';
import { EmailService } from 'src/nodemailer/nodemailer.service';
import { AzureBlobService } from '../AzureBlob.service';
import { resolveEmailAttachments } from 'src/nodemailer/attachments/resolve-email-attachments';

@Injectable()
export class AzureEmailWorkerService extends AzureBaseWorker {
  protected queueName = process.env.AZURE_QUEUE_EMAIL || 'email';
  protected readonly MAX_CONCURRENT_MESSAGES = Math.max(
    1,
    Number(process.env.AZURE_QUEUE_EMAIL_MAX_CONCURRENT_MESSAGES || 5),
  );
  protected readonly RECEIVE_BATCH_SIZE = Math.max(
    1,
    Number(process.env.AZURE_QUEUE_EMAIL_RECEIVE_BATCH_SIZE || 5),
  );

  constructor(
    private readonly emailService: EmailService,
    private readonly azureBlob: AzureBlobService,
  ) {
    super();
  }

  protected async handleMessage(message: DequeuedMessageItem): Promise<void> {
    const payload = JSON.parse(message.messageText) as EmailType;

    this.logger.log(
      `[${this.queueName}] Iniciando processamento de email to=${payload.to} cc=${payload.cc || '-'} bcc=${payload.bcc || '-'}`,
    );

    try {
      const resolvedAttachments = await resolveEmailAttachments(
        payload.attachment || [],
        async (container, blobName) =>
          this.azureBlob.download(container, blobName),
        this.logger,
      );
      payload.attachment = resolvedAttachments.attachments;

      if (payload?.data?.funcionario?.EXAMES?.length) {
        payload.data.funcionario.EXAMES = payload.data.funcionario.EXAMES.map(
          (ex) => ({
            ...ex,
            url: ex.url
              ? this.azureBlob.generateSasUrl(
                  process.env.AZURE_STORAGE_CONTAINER || 'documents',
                  ex.url,
                  60 * 24,
                )
              : undefined,
          }),
        );
      }

      await this.emailService.sendEmail(payload);

      this.logger.log(`Email enviado com sucesso 🆗`);
    } catch (err) {
      this.logger.error(`Erro ao realizar envio de email: ${err}`);
      throw err;
    }
  }
}
