import { useState, useEffect, useCallback, useRef } from "react";

import { NEST_INTERNAL_HEALTH_WORKERS } from "@/config/constants";

export interface WorkerHealthResponse {
  cmso360Worker: {
    status: "online" | "offline" | "degraded";
    url: string;
    latencyMs: number;
  };
  asoProcessingQueue: {
    approximateMessagesCount: number;
    dlqCount: number;
  };
  asoEnriquecimentoQueue: {
    approximateMessagesCount: number;
    dlqCount: number;
  };
  timestamp: string;
}

interface UseWorkerHealthOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useWorkerHealth({
  autoRefresh = true,
  refreshInterval = 30000,
}: UseWorkerHealthOptions = {}) {
  const [data, setData] = useState<WorkerHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasDataRef = useRef(false);

  const fetchHealth = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (!hasDataRef.current) {
        setIsLoading(true);
      }
      setError(null);

      const response = await fetch(NEST_INTERNAL_HEALTH_WORKERS, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = (await response.json()) as WorkerHealthResponse;
      hasDataRef.current = true;
      setData(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchHealth]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchHealth, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchHealth]);

  return {
    data,
    loading: isLoading,
    error,
    refetch: fetchHealth,
  };
}
