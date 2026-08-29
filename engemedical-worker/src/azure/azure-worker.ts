// src/workers/azure-base.worker.ts
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  DequeuedMessageItem,
  QueueClient,
  QueueServiceClient,
} from '@azure/storage-queue';
import { runWithContext } from '../core/logger/async-storage';

type ActiveMessageState = {
  startedAt: number;
  popReceipt: string;
  renewTimer?: NodeJS.Timeout;
  renewSuccessCount: number;
  renewFailureCount: number;
};

type WorkerMetrics = {
  polls: number;
  emptyPolls: number;
  messagesReceived: number;
  messagesProcessed: number;
  messagesFailed: number;
  visibilityRenews: number;
  visibilityRenewFailures: number;
};

export abstract class AzureBaseWorker implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);
  protected queueClient: QueueClient;
  protected pollingTimer: NodeJS.Timeout;
  protected healthTimer?: NodeJS.Timeout;
  protected watchdogTimer?: NodeJS.Timeout;
  protected activeMessages = new Map<string, ActiveMessageState>();
  protected isPolling = false;
  private pollStartedAt = 0;

  protected readonly POLL_WATCHDOG_MULTIPLIER = 5;
  protected readonly RECEIVE_TIMEOUT_SECONDS = Math.max(
    5,
    Number(process.env.AZURE_QUEUE_RECEIVE_TIMEOUT_SECONDS || 10),
  );
  protected readonly RECEIVE_ABORT_TIMEOUT_MS = Math.max(
    5000,
    Number(process.env.AZURE_QUEUE_RECEIVE_ABORT_TIMEOUT_MS || 10_000),
  );

  protected abstract queueName: string;
  protected abstract handleMessage(message: DequeuedMessageItem): Promise<void>;
  protected isWorkerEnabled(): boolean {
    return true;
  }

  protected readonly DELAY_BETWEEN_MESSAGES: number = 0;
  protected readonly MAX_CONCURRENT_MESSAGES = Math.max(
    1,
    Number(process.env.AZURE_QUEUE_MAX_CONCURRENT_MESSAGES || 3),
  );
  protected readonly RECEIVE_BATCH_SIZE = Math.max(
    1,
    Number(process.env.AZURE_QUEUE_RECEIVE_BATCH_SIZE || 3),
  );
  protected readonly POLLING_INTERVAL_MS = Math.max(
    1000,
    Number(process.env.AZURE_QUEUE_POLLING_INTERVAL_MS || 3000),
  );
  protected readonly VISIBILITY_TIMEOUT_SECONDS = Math.max(
    30,
    Number(process.env.AZURE_QUEUE_VISIBILITY_TIMEOUT_SECONDS || 600),
  );
  protected readonly VISIBILITY_RENEW_INTERVAL_MS = Math.max(
    30000,
    Number(process.env.AZURE_QUEUE_VISIBILITY_RENEW_INTERVAL_MS || 120000),
  );
  protected readonly HEALTH_LOG_INTERVAL_MS = Math.max(
    10000,
    Number(process.env.AZURE_QUEUE_HEALTH_LOG_INTERVAL_MS || 60000),
  );
  protected readonly LONG_RUNNING_WARNING_MS = Math.max(
    60000,
    Number(process.env.AZURE_QUEUE_LONG_RUNNING_WARNING_MS || 180000),
  );
  /**
   * Número máximo de tentativas antes de mover a mensagem para a fila de falhas (DLQ).
   * Configure via AZURE_QUEUE_MAX_DEQUEUE_COUNT. Padrão: 5.
   */
  protected readonly MAX_DEQUEUE_COUNT = Math.max(
    1,
    Number(process.env.AZURE_QUEUE_MAX_DEQUEUE_COUNT || 5),
  );
  /**
   * Nome da fila de falhas (Dead Letter Queue). Se null, usa o padrão: "<queueName>-falhas".
   */
  protected readonly deadLetterQueueName: string | null = null;
  private deadLetterQueueClient: QueueClient | null = null;

  private readonly connectionString =
    process.env.AZURE_STORAGE_CONNECTION_STRING;
  private readonly metrics: WorkerMetrics = {
    polls: 0,
    emptyPolls: 0,
    messagesReceived: 0,
    messagesProcessed: 0,
    messagesFailed: 0,
    visibilityRenews: 0,
    visibilityRenewFailures: 0,
  };
  private healthWindowStartedAt = Date.now();
  private lastMessageFinishedAt: number | null = null;

  onModuleInit() {
    if (!this.isWorkerEnabled()) {
      this.logger.warn(
        `Worker ${this.queueName} desabilitado por configuracao. Polling nao sera iniciado.`,
      );
      return;
    }

    try {
      const queueServiceClient = QueueServiceClient.fromConnectionString(
        this.connectionString!,
      );
      this.queueClient = queueServiceClient.getQueueClient(this.queueName);
      this.logger.log(`Conectado a fila: ${this.queueName}`);

      // Inicializa a fila de falhas (DLQ)
      const dlqName = this.deadLetterQueueName ?? `${this.queueName}-falhas`;
      this.deadLetterQueueClient = queueServiceClient.getQueueClient(dlqName);
      this.deadLetterQueueClient
        .createIfNotExists()
        .then(() =>
          this.logger.log(`[DLQ] Fila de falhas '${dlqName}' verificada/criada.`),
        )
        .catch((err) =>
          this.logger.warn(
            `[DLQ] Nao foi possivel verificar fila DLQ '${dlqName}': ${
              err instanceof Error ? err.message : String(err)
            }`,
          ),
        );

      this.pollingTimer = setInterval(
        () => void this.pollQueue(),
        this.POLLING_INTERVAL_MS,
      );
      this.healthTimer = setInterval(
        () => this.logHealthSnapshot(),
        this.HEALTH_LOG_INTERVAL_MS,
      );
      this.watchdogTimer = setInterval(
        () => this.watchdogCheck(),
        this.POLLING_INTERVAL_MS,
      );

      const mode =
        this.DELAY_BETWEEN_MESSAGES > 0
          ? `sequencial com delay de ${this.DELAY_BETWEEN_MESSAGES / 1000}s`
          : 'paralelo controlado';

      this.logger.log(
        `Worker ${this.queueName} iniciado | modo=${mode} | concorrencia=${this.MAX_CONCURRENT_MESSAGES} | batch=${this.RECEIVE_BATCH_SIZE} | polling=${this.POLLING_INTERVAL_MS}ms | visibility=${this.VISIBILITY_TIMEOUT_SECONDS}s | maxRetries=${this.MAX_DEQUEUE_COUNT} | dlq=${dlqName} | healthLog=${this.HEALTH_LOG_INTERVAL_MS}ms`,
      );

      void this.pollQueue();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Falha ao inicializar worker da fila ${this.queueName}: ${message}`,
      );
    }
  }

  onModuleDestroy() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    if (this.healthTimer) clearInterval(this.healthTimer);
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);

    for (const state of this.activeMessages.values()) {
      if (state.renewTimer) clearInterval(state.renewTimer);
    }

    this.activeMessages.clear();
    this.logger.log(`Worker ${this.queueName} encerrado.`);
  }

  private async pollQueue() {
    if (this.isPolling) {
      const stuckSec = this.pollStartedAt
        ? Math.round((Date.now() - this.pollStartedAt) / 1000)
        : '?';
      this.logger.warn(
        `[${this.queueName}] pollQueue ignorado: isPolling=true ha ${stuckSec}s`,
      );
      return;
    }

    if (!this.queueClient) {
      this.logger.warn(`Fila ${this.queueName} nao inicializada.`);
      return;
    }

    const availableSlots =
      this.MAX_CONCURRENT_MESSAGES - this.activeMessages.size;

    if (availableSlots <= 0) {
      this.logger.debug(
        `[${this.queueName}] Capacidade esgotada (${this.activeMessages.size}/${this.MAX_CONCURRENT_MESSAGES}).`,
      );
      return;
    }

    this.isPolling = true;
    this.pollStartedAt = Date.now();
    this.metrics.polls++;

    try {
      const response = await this.queueClient.receiveMessages(
        {
          numberOfMessages: Math.min(
            this.RECEIVE_BATCH_SIZE,
            availableSlots,
            32,
          ),
          visibilityTimeout: this.VISIBILITY_TIMEOUT_SECONDS,
          timeoutInSeconds: this.RECEIVE_TIMEOUT_SECONDS,
          abortSignal: AbortSignal.timeout(this.RECEIVE_ABORT_TIMEOUT_MS),
        },
      );

      const messages = response.receivedMessageItems;

      if (messages.length === 0) {
        this.metrics.emptyPolls++;
        this.logger.debug(
          `[${this.queueName}] Nenhuma mensagem. Em processamento=${this.activeMessages.size}.`,
        );
        return;
      }

      this.metrics.messagesReceived += messages.length;

      this.logger.log(
        `[${this.queueName}] ${messages.length} mensagem(ns) recebida(s). Em processamento=${this.activeMessages.size}.`,
      );

      if (this.DELAY_BETWEEN_MESSAGES > 0) {
        await this.processSequentially(messages);
      } else {
        for (const message of messages) {
          void this.processMessage(message);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[${this.queueName}] Erro ao buscar mensagens: ${message}`,
      );
    } finally {
      this.isPolling = false;
    }
  }

  private watchdogCheck() {
    if (!this.isPolling || !this.pollStartedAt) return;

    const stuckMs = Date.now() - this.pollStartedAt;
    const thresholdMs = this.POLLING_INTERVAL_MS * this.POLL_WATCHDOG_MULTIPLIER;

    if (stuckMs > thresholdMs) {
      const stuckSec = Math.round(stuckMs / 1000);
      this.logger.error(
        `[${this.queueName}] WATCHDOG: isPolling stuck por ${stuckSec}s (threshold=${Math.round(thresholdMs / 1000)}s). Forcando reset de isPolling.`,
      );
      this.isPolling = false;
      this.pollStartedAt = 0;
    }
  }

  private async processSequentially(messages: DequeuedMessageItem[]) {
    for (let i = 0; i < messages.length; i++) {
      try {
        await this.processMessage(messages[i]);

        if (i < messages.length - 1) {
          this.logger.debug(
            `[${this.queueName}] Aguardando ${this.DELAY_BETWEEN_MESSAGES / 1000}s antes da proxima...`,
          );
          await this.sleep(this.DELAY_BETWEEN_MESSAGES);
        }
      } catch {
        this.logger.warn(
          `[${this.queueName}] Erro na mensagem ${messages[i].messageId}, continuando...`,
        );
      }
    }
  }

  private async processMessage(message: DequeuedMessageItem) {
    await runWithContext(
      { correlationId: message.messageId, worker: this.constructor.name },
      async () => {
        const state = this.startMessageLifecycle(message);

        try {
          // Verifica se a mensagem excedeu o limite de retentativas → Dead Letter Queue
          if (
            this.MAX_DEQUEUE_COUNT > 0 &&
            (message.dequeueCount ?? 0) > this.MAX_DEQUEUE_COUNT
          ) {
            await this.sendToDeadLetterQueue(message, state);
            this.metrics.messagesProcessed++;
            this.lastMessageFinishedAt = Date.now();
            return;
          }

          await this.handleMessage(message);
          await this.queueClient.deleteMessage(
            message.messageId,
            state.popReceipt,
          );

          this.metrics.messagesProcessed++;
          this.lastMessageFinishedAt = Date.now();
          this.logger.log({
            msg: `Mensagem processada`,
            messageId: message.messageId,
            durationMs: Date.now() - state.startedAt,
            operation: 'processMessage',
          });
        } catch (error) {
          const messageText =
            error instanceof Error ? error.message : String(error);
          this.metrics.messagesFailed++;
          this.logger.error(
            {
              msg: `Falha no processamento: ${messageText}`,
              messageId: message.messageId,
              operation: 'processMessage',
            },
            error instanceof Error ? error.stack : undefined,
          );
          this.logger.warn(
            `[${this.queueName}] Mensagem ${message.messageId} ficara disponivel para retry. O worker permanecera ativo.`,
          );
        } finally {
          this.finishMessageLifecycle(message.messageId);

          if (
            !this.isPolling &&
            this.activeMessages.size < this.MAX_CONCURRENT_MESSAGES
          ) {
            void this.pollQueue();
          }
        }
      },
    );
  }

  /**
   * Hook invocado quando uma mensagem excede MAX_DEQUEUE_COUNT.
   * Subclasses podem sobrescrever para notificar sistemas externos antes do descarte.
   */
  protected async onExceededRetries(
    _message: DequeuedMessageItem,
  ): Promise<void> {
    // Hook vazio por padrão — subclasses sobrescrevem conforme necessidade
  }

  /**
   * Move uma mensagem da fila principal para a fila de falhas (Dead Letter Queue).
   * Invoca o hook onExceededRetries e depois deleta da fila original.
   */
  private async sendToDeadLetterQueue(
    message: DequeuedMessageItem,
    state: ActiveMessageState,
  ): Promise<void> {
    const dlqName = this.deadLetterQueueName ?? `${this.queueName}-falhas`;

    this.logger.warn(
      `[${this.queueName}][DLQ] Mensagem ${message.messageId} excedeu ${this.MAX_DEQUEUE_COUNT} tentativas ` +
        `(dequeueCount=${message.dequeueCount}). Movendo para '${dlqName}'.`,
    );

    // Executa hook de notificação customizado (ex: notificar backend)
    try {
      await this.onExceededRetries(message);
    } catch (err) {
      this.logger.error(
        `[${this.queueName}][DLQ] Erro no hook onExceededRetries para ${message.messageId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    // Envia payload enriquecido para a fila de falhas
    if (this.deadLetterQueueClient) {
      try {
        let originalPayload: unknown;
        try {
          originalPayload = JSON.parse(message.messageText);
        } catch {
          try {
            originalPayload = JSON.parse(
              Buffer.from(message.messageText, 'base64').toString('utf-8'),
            );
          } catch {
            originalPayload = message.messageText;
          }
        }

        const dlqPayload = JSON.stringify({
          originalQueue: this.queueName,
          messageId: message.messageId,
          dequeueCount: message.dequeueCount,
          insertedAt: message.insertedOn?.toISOString() ?? null,
          expiresAt: message.expiresOn?.toISOString() ?? null,
          movedAt: new Date().toISOString(),
          originalPayload,
        });

        await this.deadLetterQueueClient.sendMessage(
          Buffer.from(dlqPayload).toString('base64'),
        );
        this.logger.log(
          `[${this.queueName}][DLQ] Mensagem ${message.messageId} registrada em '${dlqName}'.`,
        );
      } catch (err) {
        this.logger.error(
          `[${this.queueName}][DLQ] Falha ao enviar para '${dlqName}': ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    // Remove da fila principal
    try {
      await this.queueClient.deleteMessage(message.messageId, state.popReceipt);
    } catch (err) {
      this.logger.error(
        `[${this.queueName}][DLQ] Falha ao deletar mensagem ${message.messageId} da fila principal: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private startMessageLifecycle(
    message: DequeuedMessageItem,
  ): ActiveMessageState {
    const state: ActiveMessageState = {
      startedAt: Date.now(),
      popReceipt: message.popReceipt,
      renewSuccessCount: 0,
      renewFailureCount: 0,
    };

    state.renewTimer = setInterval(async () => {
      try {
        const response = await (this.queueClient as any).updateMessage(
          message.messageId,
          state.popReceipt,
          message.messageText,
          this.VISIBILITY_TIMEOUT_SECONDS,
        );

        if (response?.popReceipt) {
          state.popReceipt = response.popReceipt;
        }

        state.renewSuccessCount++;
        this.metrics.visibilityRenews++;

        const runningMs = Date.now() - state.startedAt;
        this.logger.debug(
          `[${this.queueName}] Visibility renovada para ${message.messageId}. tempoEmProcessamento=${runningMs}ms renoves=${state.renewSuccessCount}`,
        );

        if (runningMs >= this.LONG_RUNNING_WARNING_MS) {
          this.logger.warn(
            `[${this.queueName}] Mensagem ${message.messageId} ainda em processamento ha ${Math.round(runningMs / 1000)}s. renoves=${state.renewSuccessCount} falhasRenovacao=${state.renewFailureCount}`,
          );
        }
      } catch (error) {
        const messageText =
          error instanceof Error ? error.message : String(error);
        state.renewFailureCount++;
        this.metrics.visibilityRenewFailures++;
        this.logger.warn(
          `[${this.queueName}] Falha ao renovar visibility da mensagem ${message.messageId}: ${messageText}`,
        );
      }
    }, this.VISIBILITY_RENEW_INTERVAL_MS);

    this.activeMessages.set(message.messageId, state);

    this.logger.debug(
      `[${this.queueName}] Iniciando mensagem ${message.messageId}. Em processamento=${this.activeMessages.size}/${this.MAX_CONCURRENT_MESSAGES}. dequeueCount=${message.dequeueCount || 'n/d'}`,
    );

    return state;
  }

  private finishMessageLifecycle(messageId: string) {
    const state = this.activeMessages.get(messageId);

    if (state?.renewTimer) {
      clearInterval(state.renewTimer);
    }

    this.activeMessages.delete(messageId);

    this.logger.debug(
      `[${this.queueName}] Liberando slot da mensagem ${messageId}. Em processamento=${this.activeMessages.size}/${this.MAX_CONCURRENT_MESSAGES}.`,
    );
  }

  private async logHealthSnapshot() {
    const now = Date.now();
    const windowMs = Math.max(1, now - this.healthWindowStartedAt);
    const throughputPerMin = (
      (this.metrics.messagesProcessed * 60000) /
      windowMs
    ).toFixed(2);
    const failureRate = this.metrics.messagesReceived
      ? (
          (this.metrics.messagesFailed / this.metrics.messagesReceived) *
          100
        ).toFixed(2)
      : '0.00';
    const longestRunningMs = this.getLongestRunningMessageMs(now);
    const idleSeconds = this.lastMessageFinishedAt
      ? Math.round((now - this.lastMessageFinishedAt) / 1000)
      : null;

    let peekInfo = '';
    try {
      const peeked = await this.queueClient.peekMessages({ numberOfMessages: 1 });
      const approxCount = peeked.peekedMessageItems.length;
      const peekedId = peeked.peekedMessageItems[0]?.messageId || 'none';
      peekInfo = ` | peek=${approxCount} peekedId=${peekedId}`;
    } catch {
      peekInfo = ' | peek=ERROR';
    }

    this.logger.log(
      `[${this.queueName}][HEALTH] active=${this.activeMessages.size}/${this.MAX_CONCURRENT_MESSAGES} polls=${this.metrics.polls} emptyPolls=${this.metrics.emptyPolls} recebidas=${this.metrics.messagesReceived} processadas=${this.metrics.messagesProcessed} falhas=${this.metrics.messagesFailed} failRate=${failureRate}% throughput=${throughputPerMin}/min renewOk=${this.metrics.visibilityRenews} renewFail=${this.metrics.visibilityRenewFailures} longestRunningMs=${longestRunningMs} lastFinishedAgoSec=${idleSeconds ?? 'n/d'}${peekInfo}`,
    );

    if (
      this.activeMessages.size > 0 &&
      longestRunningMs >= this.LONG_RUNNING_WARNING_MS
    ) {
      this.logger.warn(
        `[${this.queueName}][HEALTH] Existe processamento longo em andamento. longestRunningMs=${longestRunningMs} threshold=${this.LONG_RUNNING_WARNING_MS}`,
      );
    }

    this.resetHealthWindow();
  }

  private getLongestRunningMessageMs(now: number): number {
    let longest = 0;

    for (const state of this.activeMessages.values()) {
      const elapsed = now - state.startedAt;
      if (elapsed > longest) longest = elapsed;
    }

    return longest;
  }

  private resetHealthWindow() {
    this.metrics.polls = 0;
    this.metrics.emptyPolls = 0;
    this.metrics.messagesReceived = 0;
    this.metrics.messagesProcessed = 0;
    this.metrics.messagesFailed = 0;
    this.metrics.visibilityRenews = 0;
    this.metrics.visibilityRenewFailures = 0;
    this.healthWindowStartedAt = Date.now();
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
