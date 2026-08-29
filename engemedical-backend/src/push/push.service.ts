import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';

interface eventInterface {
  title?: string;
  body?: string;
}

interface SubscriptionEntry {
  sub: any;
  contexto?: {
    tipo?: 'recepcao' | 'atendimento';
    sala?: string;
    exame?: string;
  };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private _subscriptions: Record<string, SubscriptionEntry[]> = {};
  private readonly enabled: boolean;

  constructor() {
    const publicKey = process.env.NOTIFICATIONS_PUBLICKEY;
    const privateKey = process.env.NOTIFICATIONS_PRIVATEKEY;

    if (!publicKey || !privateKey) {
      this.enabled = false;
      this.logger.warn(
        '[PUSH] Chaves VAPID ausentes. Notificacoes push desabilitadas.',
      );
      return;
    }

    try {
      webpush.setVapidDetails(
        'mailto:felix.devx@gmail.com', // contato
        publicKey,
        privateKey,
      );
      this.enabled = true;
    } catch (error) {
      this.enabled = false;
      this.logger.error(
        `[PUSH] Falha ao inicializar VAPID. Notificacoes push desabilitadas: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async addSubscription(
    unidade: string,
    sub: any,
    contexto?: { tipo?: string; sala?: string; exame?: string },
  ) {
    const key = contexto?.tipo
      ? `${unidade}:${contexto.tipo}`
      : unidade;

    if (!this._subscriptions[key]) {
      this._subscriptions[key] = [];
    }

    // Atualizar contexto se o endpoint já existir, ou adicionar novo
    const existing = this._subscriptions[key].find(
      (entry) => entry.sub.endpoint === sub.endpoint,
    );

    if (existing) {
      existing.contexto = contexto as SubscriptionEntry["contexto"];
      this.logger.log(
        `[PUSH] Subscription atualizada: ${key} (contexto renovado)`,
      );
    } else {
      this._subscriptions[key].push({ sub, contexto: contexto as SubscriptionEntry["contexto"] });
      this.logger.log(
        `[PUSH] Subscription adicionada: ${key} (endpoint: ${sub.endpoint?.substring(0, 50)}...)`,
      );
    }
  }

  // Método para ser chamado dentro do seu socket handler (PREPARO)
  async sendFromEvent(unidade: string, event: eventInterface) {
    if (!this.enabled) return;

    const { title = undefined, body = undefined } = event;

    const payload = {
      title: title,
      body: body,
    };

    // Enviar para subscriptions da unidade (backward compatibility)
    const key = unidade;
    if (this._subscriptions[key]) {
      for (const { sub } of this._subscriptions[key]) {
        webpush.sendNotification(sub, JSON.stringify(payload));
      }
    }
  }

  // Novo método para notificações de atendimento
  async sendAtendimentoNotification(
    unidade: string,
    payload: {
      title?: string;
      body?: string;
      sala?: string;
      exame?: string;
      funcionarioNome?: string;
    },
  ) {
    if (!this.enabled) return;

    const key = `${unidade}:atendimento`;
    const subscriptions = this._subscriptions[key] || [];

    if (subscriptions.length === 0) {
      this.logger.debug(
        `[PUSH] Nenhuma subscription de atendimento para ${unidade}`,
      );
      return;
    }

    let sentCount = 0;
    let filteredCount = 0;

    for (const { sub, contexto } of subscriptions) {
      // Filtrar por sala se fornecido
      if (contexto?.sala && payload.sala && contexto.sala !== payload.sala) {
        filteredCount++;
        continue;
      }

      // Filtrar por exame se fornecido
      if (contexto?.exame && payload.exame && contexto.exame !== payload.exame) {
        filteredCount++;
        continue;
      }

      try {
        await webpush.sendNotification(sub, JSON.stringify({
          title: payload.title || 'Novo Atendimento',
          body: payload.body || 'Um atendimento foi recebido na sala.',
        }));
        sentCount++;
      } catch (error) {
        this.logger.error(
          `[PUSH] Erro ao enviar notificação: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(
      `[PUSH] Atendimento notification: ${sentCount} enviadas, ${filteredCount} filtradas para ${unidade}`,
    );
  }

  private async broadcastToAllSubscriptions(payload: string): Promise<number> {
    let sentCount = 0;

    for (const subscriptions of Object.values(this._subscriptions)) {
      for (const { sub } of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
          sentCount++;
        } catch (error) {
          this.logger.error(
            `[PUSH] Erro ao enviar notificação: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    return sentCount;
  }

  private async broadcastToSubscriptionKey(
    key: string,
    payload: string,
  ): Promise<number> {
    const subscriptions = this._subscriptions[key] || [];
    let sentCount = 0;

    for (const { sub } of subscriptions) {
      try {
        await webpush.sendNotification(sub, payload);
        sentCount++;
      } catch (error) {
        this.logger.error(
          `[PUSH] Erro ao enviar notificação: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return sentCount;
  }

  async sendGedBatchUpdate(payload: {
    id: string;
    empresa: {
      codigoEmpresa: string;
      razaoSocial: string;
    };
    status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'partial';
    totalFuncionarios: number;
    processedFuncionarios: number;
    succeededFuncionarios: number;
    failedFuncionarios: number;
    result?: {
      zipBlobName?: string;
      zipUrl?: string;
    };
    errors?: Array<{
      codigoProntuario?: string;
      funcionario?: string;
      message: string;
    }>;
  }): Promise<void> {
    if (!this.enabled) return;

    const statusLabel = {
      pending: 'aguardando processamento',
      queued: 'em fila',
      processing: 'em processamento',
      completed: 'concluído',
      partial: 'concluído com pendências',
      failed: 'com falha',
    }[payload.status];

    const title = {
      pending: 'Lote de documentos aguardando processamento',
      queued: 'Lote de documentos em fila',
      processing: 'Lote de documentos em andamento',
      completed: 'Lote de documentos concluído',
      partial: 'Lote de documentos concluído com pendências',
      failed: 'Lote de documentos com falha',
    }[payload.status];

    const message = JSON.stringify({
      title,
      body: `${payload.empresa.razaoSocial} ${statusLabel}. ${payload.succeededFuncionarios}/${payload.totalFuncionarios} prontuário(s) concluído(s) e ${payload.failedFuncionarios} com erro.`,
      type: payload.status === 'failed' ? 'error' : payload.status === 'partial' ? 'warning' : 'success',
      actionUrl: payload.result?.zipUrl || '/servicos',
      actionLabel: payload.result?.zipUrl ? 'Baixar lote' : 'Ver documentos',
      dedupeKey: `ged-batch:${payload.id}:${payload.status}`,
      metadata: {
        jobId: payload.id,
        status: payload.status,
        codigoEmpresa: payload.empresa.codigoEmpresa,
        totalFuncionarios: payload.totalFuncionarios,
        processedFuncionarios: payload.processedFuncionarios,
        succeededFuncionarios: payload.succeededFuncionarios,
        failedFuncionarios: payload.failedFuncionarios,
      },
      ...payload,
    });

    const sentCount = await this.broadcastToSubscriptionKey(
      'ged_servicos',
      message,
    );

    this.logger.log(
      `[PUSH] GED batch update enviado para ${sentCount} subscriptions`,
    );
  }
}

