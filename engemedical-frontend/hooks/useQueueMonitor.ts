import { useState, useEffect, useCallback, useRef } from "react";

import { NEST_AZURE_QUEUES_STATS, NEST_AZURE_QUEUE_PEEK } from "@/config/constants";
import { getCurrentUser } from "@/lib/utils";

export interface QueueStat {
  name: string;
  approximateMessagesCount: number;
}

export interface QueueStatsResponse {
  queues: QueueStat[];
  totalMessages: number;
  timestamp: string;
}

export interface QueuePeekMessage {
  messageId: string;
  insertedOn: string;
  expiresOn: string;
  dequeueCount: number;
  payload: Record<string, unknown> | null;
}

export interface QueuePeekResponse {
  queueName: string;
  messages: QueuePeekMessage[];
  count: number;
  timestamp: string;
}

export interface QueueWorkerInfo {
  consumer: string;
  concurrency: number;
  visibilitySeconds: number;
  description: string;
  label: string;
}

export const QUEUE_WORKER_MAP: Record<string, QueueWorkerInfo> = {
  "resultados-exames": {
    label: "Gerador de Laudos e Resultados",
    consumer: "cmso360-worker (PDF Worker)",
    concurrency: 3,
    visibilitySeconds: 600,
    description: "Responsável por montar o arquivo PDF dos exames finalizados",
  },
  email: {
    label: "E-mails do Sistema",
    consumer: "cmso360-worker (Email Worker)",
    concurrency: 5,
    visibilitySeconds: 600,
    description: "Envios diários automáticos (Recuperação de senhas, notificações, ASO)",
  },
  "customer-email-campaign": {
    label: "Disparos de E-mail Marketing",
    consumer: "cmso360-worker (Campaign Orchestrator)",
    concurrency: 1,
    visibilitySeconds: 300,
    description: "Envia os comunicados e campanhas em massa de forma assíncrona",
  },
  socged: {
    label: "Integração SOCGED",
    consumer: "Backend + cmso360-worker",
    concurrency: 1,
    visibilitySeconds: 300,
    description: "Envia os documentos assinados para os servidores do SOC",
  },
  "aso-processing": {
    label: "Gerador de ASO Visual",
    consumer: "cmso360-aso-generate (Puppeteer)",
    concurrency: 1,
    visibilitySeconds: 900,
    description: "Lê os dados do sistema e monta visualmente o documento ASO",
  },
  "aso-enriquecimento": {
    label: "Assinatura Digital de ASO",
    consumer: "cmso360-worker (Enrichment)",
    concurrency: 1,
    visibilitySeconds: 600,
    description: "Aplica a assinatura médica eletrônica e sela digitalmente o ASO",
  },
  "exames-enriquecimento": {
    label: "Assinatura Digital de Exames",
    consumer: "cmso360-worker (Enrichment)",
    concurrency: 1,
    visibilitySeconds: 600,
    description: "Aplica a assinatura eletrônica em laudos e exames laboratoriais",
  },
  "google-drive-upload": {
    label: "Backup Google Drive",
    consumer: "Backend (desabilitado)",
    concurrency: 1,
    visibilitySeconds: 300,
    description: "Salva cópias de segurança dos documentos na nuvem do Google",
  },
  "resultado-exame-soc": {
    label: "Processamento SOC (Resultados)",
    consumer: "Backend (SOC Service)",
    concurrency: 1,
    visibilitySeconds: 300,
    description: "Sincroniza e processa resultados específicos de exames junto ao SOC",
  },
  "ged-batch": {
    label: "Gerador de Prontuários (Lote)",
    consumer: "cmso360-worker (GED Batch)",
    concurrency: 1,
    visibilitySeconds: 600,
    description: "Prepara e empacota milhares de prontuários em um arquivo ZIP",
  },
  "email-falhas": {
    label: "Falhas Inesperadas: E-mails",
    consumer: "Sem Consumidor (Fila Morta)",
    concurrency: 0,
    visibilitySeconds: 0,
    description: "E-mails bloqueados que não puderam ser enviados após várias tentativas",
  },
  "ged-batch-falhas": {
    label: "Falhas Inesperadas: Prontuários (Lote)",
    consumer: "Sem Consumidor (Fila Morta)",
    concurrency: 0,
    visibilitySeconds: 0,
    description: "Lotes de ZIP que falharam por problemas de rede ou corrupção",
  },
  "aso-enriquecimento-falhas": {
    label: "Falhas Inesperadas: Assinatura ASO",
    consumer: "Sem Consumidor (Fila Morta)",
    concurrency: 0,
    visibilitySeconds: 0,
    description: "ASOs que falharam ao tentar receber a assinatura digital do médico",
  },
  "exames-enriquecimento-falhas": {
    label: "Falhas Inesperadas: Assinatura de Exames",
    consumer: "Sem Consumidor (Fila Morta)",
    concurrency: 0,
    visibilitySeconds: 0,
    description: "Exames que falharam ao tentar receber a assinatura digital",
  },
  "aso-processing-falhas": {
    label: "Falhas Inesperadas: Gerador ASO",
    consumer: "Sem Consumidor (Fila Morta)",
    concurrency: 0,
    visibilitySeconds: 0,
    description: "ASOs que não puderam ser montados visualmente e exigem intervenção manual",
  },
};

export async function requeueMessage(
  sourceQueueName: string,
  targetQueueName: string,
  editedPayload?: Record<string, unknown> | null
) {
  const currentUser = getCurrentUser();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (currentUser) {
    headers["x-auth-user"] = JSON.stringify(currentUser);
  }

  const res = await fetch(
    `${NEST_AZURE_QUEUE_PEEK}/${encodeURIComponent(sourceQueueName)}/requeue`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        targetQueueName,
        editedPayload: editedPayload ?? null,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Erro ao reenfileirar" }));
    throw new Error(err.message || "Erro ao reenfileirar mensagem");
  }
  return res.json();
}

interface UseQueueMonitorOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useQueueMonitor({
  autoRefresh = true,
  refreshInterval = 15000,
}: UseQueueMonitorOptions = {}) {
  const [data, setData] = useState<QueueStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasDataRef = useRef(false);

  const fetchStats = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (!hasDataRef.current) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const currentUser = getCurrentUser();
      const headers: Record<string, string> = {};
      if (currentUser) {
        headers["x-auth-user"] = JSON.stringify(currentUser);
      }

      const response = await fetch(NEST_AZURE_QUEUES_STATS, {
        signal: controller.signal,
        headers,
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = (await response.json()) as QueueStatsResponse;
      hasDataRef.current = true;
      setData(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setError(err as Error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchStats, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchStats]);

  return {
    data,
    loading: isLoading,
    isRefreshing,
    error,
    refetch: fetchStats,
  };
}

export function useQueuePeek(queueName: string | null) {
  const [data, setData] = useState<QueuePeekResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPeek = useCallback(async () => {
    if (!queueName) {
      setData(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      setError(null);

      const currentUser = getCurrentUser();
      const headers: Record<string, string> = {};
      if (currentUser) {
        headers["x-auth-user"] = JSON.stringify(currentUser);
      }

      const response = await fetch(
        `${NEST_AZURE_QUEUE_PEEK}/${encodeURIComponent(queueName)}/peek?limit=10`,
        {
          signal: controller.signal,
          headers,
        },
      );

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = (await response.json()) as QueuePeekResponse;
      setData(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [queueName]);

  useEffect(() => {
    fetchPeek();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPeek]);

  return {
    data,
    loading: isLoading,
    error,
    refetch: fetchPeek,
  };
}
