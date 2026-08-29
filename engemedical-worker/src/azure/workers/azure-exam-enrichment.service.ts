import { Injectable } from '@nestjs/common';
import { DequeuedMessageItem } from '@azure/storage-queue';
import { AzurePdfWorkerService } from './azure.pdf.service';
import { PdfmakeService } from 'src/pdfmake/pdfmake.service';
import { MongoService } from 'src/mongo/mongo.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BryClientService } from 'src/signature/bry-client.service';

@Injectable()
export class AzureExamEnrichmentWorkerService extends AzurePdfWorkerService {
  protected queueName =
    process.env.AZURE_QUEUE_EXAME_ENRIQUECIMENTO || 'exames-enriquecimento';

  constructor(
    pdfMakeService: PdfmakeService,
    mongoService: MongoService,
    supabaseService: SupabaseService,
    bryClientService: BryClientService,
  ) {
    super(pdfMakeService, mongoService, supabaseService, bryClientService);
  }

  /**
   * Notifica o backend quando a mensagem excede o limite de retentativas.
   * Chamado automaticamente pela classe base antes de mover para a fila de falhas.
   */
  protected async onExceededRetries(
    message: DequeuedMessageItem,
  ): Promise<void> {
    this.logger.error(
      `[${this.queueName}] Notificando backend sobre falha definitiva para mensagem ${message.messageId} (dequeueCount=${message.dequeueCount}).`,
    );
    try {
      const payload = JSON.parse(message.messageText);
      const { funcionario, grupo } = payload;
      const schedulingId = String((funcionario as any)?._id || '');

      const scheduling = await (this as any).mongoService.getSchedulingById(
        schedulingId,
      );
      const exam = scheduling?.EXAMES?.find(
        (e: any) =>
          e.grupo?.trim().toLowerCase() === grupo?.trim().toLowerCase(),
      );
      const existingUrl = exam?.url || '';

      const examCodes =
        funcionario?.EXAMES?.filter(
          (e: any) =>
            e.grupo?.trim().toLowerCase() === grupo?.trim().toLowerCase(),
        )
          .map((e: any) => e.codigoExame)
          .filter(Boolean) || [];

      const signatureInfo = {
        status: 'FALHA',
        lastError: `Máximo de tentativas excedido (${message.dequeueCount}). Assinatura cancelada.`,
        retryCount: message.dequeueCount,
      };

      await (this as any).notifyBackendExamUpdated({
        schedulingId,
        grupoExame: grupo,
        examCodes,
        signatureInfo,
        url: existingUrl,
        commandId: message.messageId,
      });
    } catch (err) {
      this.logger.error(
        `[${this.queueName}] Erro ao notificar backend sobre falha: ${err}`,
      );
    }
  }
}
