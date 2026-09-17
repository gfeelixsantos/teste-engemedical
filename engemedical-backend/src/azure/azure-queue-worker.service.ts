import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DequeuedMessageItem, QueueClient } from '@azure/storage-queue';
import { SocService } from '../soc/soc.service';
import { AzureService } from './azure.service';

@Injectable()
export class AzureQueueWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AzureQueueWorkerService.name);
  private isRunning = false;
  private readonly resultadoExameSocMaxAttempts = 3;
  private readonly resultadoExameSocRetryDelaysMs = [10_000, 20_000];
  private readonly resultadoExameSocVisibilityTimeout = 90;

  constructor(
    @Inject(forwardRef(() => AzureService))
    private readonly azureService: AzureService,
    @Inject(forwardRef(() => SocService))
    private readonly socService: SocService,
  ) { }

  onModuleInit() {
    this.logger.log(
      '[AZURE_QUEUE_WORKER] Iniciando listeners de fila no backend...',
    );

    const queuesEnabled = String(process.env.AZURE_QUEUES_ENABLED || 'true').toLowerCase() === 'true';
    if (!queuesEnabled) {
      this.logger.warn(
        '[AZURE_QUEUE_WORKER] Filas Azure desabilitadas por variavel de ambiente (AZURE_QUEUES_ENABLED=false). Polling nao sera iniciado.',
      );
      return;
    }

    if (!this.azureService.isEnabled()) {
      this.logger.warn(
        '[AZURE_QUEUE_WORKER] Azure desabilitado no ambiente atual. Polling de filas nao sera iniciado.',
      );
      return;
    }

    this.isRunning = true;

    this.logger.warn(
      '[AZURE_QUEUE_WORKER] Fila ASO-ENRIQUECIMENTO removida do backend. Fluxo oficial segue apenas no engemedical-connect-worker.',
    );
    this.logger.warn(
      '[AZURE_QUEUE_WORKER] Fila EXAME-ENRIQUECIMENTO removida do backend. Fluxo oficial segue apenas no engemedical-connect-worker.',
    );
    this.pollResultadoExameSoc();
    this.pollSocged();
  }

  onModuleDestroy() {
    this.isRunning = false;
    this.logger.log('[AZURE_QUEUE_WORKER] Parando listeners de fila.');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseQueuePayload(messageText: string, queueTag: string): any {
    const raw = String(messageText || '').trim();

    try {
      return JSON.parse(raw);
    } catch (parseError) {
      throw new Error(
        `[AZURE_QUEUE_WORKER][${queueTag}] Payload invalido: esperado JSON direto. Erro: ${parseError.message}`,
      );
    }
  }

  private async pollSocged() {
    const queueClient = (this.azureService as any)
      .queueSocgedClient as QueueClient;
    if (!queueClient) return;

    while (this.isRunning) {
      try {
        const response = await queueClient.receiveMessages({
          numberOfMessages: 5,
          visibilityTimeout: 300,
        });

        for (const message of response.receivedMessageItems) {
          let payload: any;
          try {
            payload = this.parseQueuePayload(message.messageText, 'SOCGED');
          } catch (parseError: any) {
            this.logger.error(
              `[AZURE_QUEUE_WORKER][SOCGED] Erro ao parsear mensagem ${message.messageId}: ${parseError?.message ?? parseError}. Removendo item invalido da fila.`,
            );
            await queueClient.deleteMessage(
              message.messageId,
              message.popReceipt,
            );
            continue;
          }

          this.logger.log(
            `[AZURE_QUEUE_WORKER][SOCGED] Mensagem recebida: ${payload.nomeArquivo} | classificacao=${payload.classificacao ?? 'n/a'} | tipoGed=${payload.tipoGed ?? 'n/a'} | schedulingId=${payload.schedulingId ?? 'n/a'} | url=${payload.url ?? 'n/a'}`,
          );

          try {
            await this.socService.uploadFile(payload);
            await queueClient.deleteMessage(
              message.messageId,
              message.popReceipt,
            );
            this.logger.log(
              `[AZURE_QUEUE_WORKER][SOCGED] Mensagem processada e removida: ${payload.nomeArquivo}`,
            );
          } catch (error: any) {
            const errorMessage = String(error?.message ?? error);
            if (
              errorMessage.includes(
                'Nenhum PDF de exame disponivel para merge do prontuario',
              )
            ) {
              continue;
            }
            this.logger.error(
              `[AZURE_QUEUE_WORKER][SOCGED] Erro ao processar SOCGED: ${errorMessage}`,
            );
          }
        }
      } catch (err: any) {
        this.logger.error(
          `[AZURE_QUEUE_WORKER][SOCGED] Erro no polling: ${err?.message ?? err}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  private async handleResultadoExameSocMessage(
    queueClient: QueueClient,
    message: DequeuedMessageItem,
  ): Promise<void> {
    let payload: any;
    try {
      payload = this.parseQueuePayload(
        message.messageText ?? '',
        'RESULTADO-EXAME-SOC',
      );
    } catch (parseError: any) {
      this.logger.error(
        `[AZURE_QUEUE_WORKER][RESULTADO-EXAME-SOC] Erro ao parsear mensagem ${message.messageId}: ${parseError?.message ?? parseError}. Removendo item invalido da fila.`,
      );
      await queueClient.deleteMessage(message.messageId, message.popReceipt);
      return;
    }

    const schedulingId = payload.schedulingId ?? 'n/a';
    const grupo = payload.grupo ?? 'n/a';
    const examIndex = payload.examIndex ?? 'n/a';
    const codigoExame = payload.codigoExame ?? 'n/a';

    this.logger.log(
      `[AZURE_QUEUE_WORKER][RESULTADO-EXAME-SOC] Mensagem recebida: schedulingId=${schedulingId} | grupo=${grupo} | examIndex=${examIndex} | codigoExame=${codigoExame} | sequencialResultadoExame=${payload.sequencialResultadoExame ?? 'n/a'} | sequencialFicha=${payload.sequencialFicha ?? 'n/a'}`,
    );

    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= this.resultadoExameSocMaxAttempts;
      attempt++
    ) {
      try {
        const result =
          await this.socService.processResultadoExameSocQueueMessage(payload);

        if (result.deleteMessage) {
          await queueClient.deleteMessage(message.messageId, message.popReceipt);
          this.logger.log(
            `[AZURE_QUEUE_WORKER][RESULTADO-EXAME-SOC] Mensagem processada e removida: schedulingId=${schedulingId} | examIndex=${examIndex}${attempt > 1 ? ` | tentativa=${attempt}` : ''}`,
          );
        }
        return;
      } catch (error: any) {
        lastError = error;
        const errorMessage = String(error?.message ?? error);
        this.logger.error(
          `[AZURE_QUEUE_WORKER][RESULTADO-EXAME-SOC] Erro ao processar integracao SOC (tentativa ${attempt}/${this.resultadoExameSocMaxAttempts}): ${errorMessage}`,
        );

        if (attempt < this.resultadoExameSocMaxAttempts) {
          const delayMs =
            this.resultadoExameSocRetryDelaysMs[attempt - 1] ?? 0;
          this.logger.warn(
            `[AZURE_QUEUE_WORKER][RESULTADO-EXAME-SOC][RETRY] schedulingId=${schedulingId} | grupo=${grupo} | codigoExame=${codigoExame} | tentativa=${attempt}/${this.resultadoExameSocMaxAttempts} | proximaEmMs=${delayMs}`,
          );
          await this.sleep(delayMs);
        }
      }
    }

    await queueClient.deleteMessage(message.messageId, message.popReceipt);
    this.logger.error(
      `[AZURE_QUEUE_WORKER][RESULTADO-EXAME-SOC][DISCARDED] schedulingId=${schedulingId} | grupo=${grupo} | examIndex=${examIndex} | codigoExame=${codigoExame} | tentativas=${this.resultadoExameSocMaxAttempts} | ultimoErro=${String((lastError as any)?.message ?? lastError)}`,
    );
  }

  private async pollResultadoExameSoc() {
    const queueClient = (this.azureService as any)
      .queueResultadoExameSocClient as QueueClient;
    if (!queueClient) return;

    while (this.isRunning) {
      try {
        const response = await queueClient.receiveMessages({
          numberOfMessages: 5,
          visibilityTimeout: this.resultadoExameSocVisibilityTimeout,
        });

        for (const message of response.receivedMessageItems) {
          void this.handleResultadoExameSocMessage(queueClient, message).catch(
            (err: any) => {
              this.logger.error(
                `[AZURE_QUEUE_WORKER][RESULTADO-EXAME-SOC] Erro inesperado no handler: ${err?.message ?? err}`,
              );
            },
          );
        }
      } catch (err: any) {
        this.logger.error(
          `[AZURE_QUEUE_WORKER][RESULTADO-EXAME-SOC] Erro no polling: ${err?.message ?? err}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

}
