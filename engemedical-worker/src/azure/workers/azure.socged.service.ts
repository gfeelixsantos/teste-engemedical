// src/workers/azure-socged.worker.service.ts
import { Injectable } from '@nestjs/common';
import { DequeuedMessageItem } from '@azure/storage-queue';
import { AzureBaseWorker } from '../azure-worker';
import { UploadSocged } from '../types/azure.types';
import { SocService } from 'src/soc/soc.service';

@Injectable()
export class AzureSocgedWorkerService extends AzureBaseWorker {
  protected queueName = process.env.AZURE_QUEUE_SOCGED || 'socged';
  protected readonly MAX_CONCURRENT_MESSAGES = 1;
  protected readonly RECEIVE_BATCH_SIZE = 1;

  // Delay de 10 segundos entre uploads
  // A API do SOC tem limite de invocações simultâneas
  protected readonly DELAY_BETWEEN_MESSAGES: number = 10000;

  constructor(private readonly socService: SocService) {
    super();
  }

  protected async handleMessage(message: DequeuedMessageItem): Promise<void> {
    const payload = JSON.parse(message.messageText) as UploadSocged;
    const currentAttempt = message.dequeueCount || 1;

    this.logger.log(
      `[${this.queueName}] Processando upload SOCGED (tentativa ${currentAttempt}): ${payload.nomeArquivo}`,
    );

    try {
      // validação mínima de campos obrigatórios (opcional)
      // não filtramos ou checamos exames/estatus aqui, isso já foi feito
      // no backend; o worker apenas dispara o envio à API.
      await this.socService.sendUploadSocgedWs(payload);

      this.logger.log(
        `[${this.queueName}] ✅ Upload SOCGED concluído: ${payload.nomeArquivo}`,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // trata como erro recuperável sempre que for timeout/sem PDF
      const isRecoverableError =
        errorMessage.includes('Timeout aguardando') ||
        errorMessage.includes('não encontrado');

      if (isRecoverableError && currentAttempt < 5) {
        this.logger.warn(
          `[${this.queueName}] ⏳ Erro recuperável (tentativa ${currentAttempt}/5): ${errorMessage}`,
        );
        throw err;
      } else if (currentAttempt >= 5) {
        this.logger.error(
          `[${this.queueName}] 🚨 Max tentativas atingido para: ${payload.nomeArquivo}`,
        );
      } else {
        this.logger.error(
          `[${this.queueName}] ❌ Erro não recuperável: ${errorMessage}`,
        );
        throw err;
      }
    }
  }
}
