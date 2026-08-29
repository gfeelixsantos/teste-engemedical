"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { WORKER_SCRAPER_STATUS, WORKER_WS_URL } from "@/config/constants";
import { WebsocketType } from "@/lib/websocket/enums/websocket.enum";

interface ProviderMetrics {
  provider: string;
  status: "Aguardando" | "Processando" | "Finalizado" | "Erro";
  lastProcessed?: string;
  nextRunAt?: string;
  scheduleLabel?: string;
  countToday: number;
  analyzedToday: number;
  receivedToday: number;
  intervalMinutes: number;
}

const POLLING_INTERVAL_MS = 60000;
const RECONCILIATION_INTERVAL_MS = 5 * 60000;
const WS_CONNECTION_TIMEOUT_MS = 10000;
const SCRAPER_METRICS_CACHE_KEY = "dashboard_scraper_metrics_cache_v1";
const SCRAPER_METRICS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface ScraperMetricsCache {
  updatedAt: string;
  metrics: ProviderMetrics[];
}

type ProviderStatus = ProviderMetrics["status"];

const isToday = (date: Date) => {
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const loadCachedMetrics = (): ScraperMetricsCache | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(SCRAPER_METRICS_CACHE_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as ScraperMetricsCache;

    if (!parsed?.updatedAt || !Array.isArray(parsed.metrics)) return null;

    const updatedAt = new Date(parsed.updatedAt);
    const isExpired =
      Number.isNaN(updatedAt.getTime()) ||
      Date.now() - updatedAt.getTime() > SCRAPER_METRICS_CACHE_TTL_MS;

    if (isExpired) {
      localStorage.removeItem(SCRAPER_METRICS_CACHE_KEY);

      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const saveCachedMetrics = (metrics: ProviderMetrics[]) => {
  if (typeof window === "undefined") return;

  try {
    const payload: ScraperMetricsCache = {
      updatedAt: new Date().toISOString(),
      metrics,
    };

    localStorage.setItem(SCRAPER_METRICS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // No-op when storage is unavailable.
  }
};

const mergeProviderMetrics = (
  incoming: ProviderMetrics,
  cached?: ProviderMetrics,
): ProviderMetrics => {
  if (!cached) return incoming;

  const waitingForNextProcessing =
    incoming.status === "Aguardando" &&
    (incoming.analyzedToday || 0) === 0 &&
    (incoming.receivedToday || 0) === 0;

  const cachedLastProcessedDate = cached.lastProcessed
    ? new Date(cached.lastProcessed)
    : null;
  const canUseCachedCounters =
    waitingForNextProcessing &&
    !!cachedLastProcessedDate &&
    !Number.isNaN(cachedLastProcessedDate.getTime()) &&
    isToday(cachedLastProcessedDate);

  return {
    ...incoming,
    lastProcessed: incoming.lastProcessed || cached.lastProcessed,
    nextRunAt: incoming.nextRunAt || cached.nextRunAt,
    scheduleLabel: incoming.scheduleLabel || cached.scheduleLabel,
    intervalMinutes: incoming.intervalMinutes || cached.intervalMinutes || 60,
    countToday:
      canUseCachedCounters && !incoming.countToday
        ? cached.countToday
        : incoming.countToday,
    analyzedToday:
      canUseCachedCounters && !incoming.analyzedToday
        ? cached.analyzedToday
        : incoming.analyzedToday,
    receivedToday:
      canUseCachedCounters && !incoming.receivedToday
        ? cached.receivedToday
        : incoming.receivedToday,
  };
};

const mergeIncomingWithCache = (
  incoming: ProviderMetrics[],
  cached: ProviderMetrics[],
) => {
  if (!incoming.length) return cached;

  const cachedByProvider = new Map(cached.map((item) => [item.provider, item]));
  const incomingByProvider = new Set(incoming.map((item) => item.provider));

  const merged = incoming.map((item) =>
    mergeProviderMetrics(item, cachedByProvider.get(item.provider)),
  );

  cached.forEach((cachedItem) => {
    if (!incomingByProvider.has(cachedItem.provider)) {
      merged.push(cachedItem);
    }
  });

  return merged.sort((a, b) => a.provider.localeCompare(b.provider));
};

const getStatusConfig = (status: ProviderStatus) => {
  switch (status) {
    case "Processando":
      return {
        dotClass: "bg-blue-500 animate-pulse",
      };
    case "Finalizado":
      return {
        dotClass: "bg-green-500",
      };
    case "Erro":
      return {
        dotClass: "bg-red-500",
      };
    default:
      return {
        dotClass: "bg-gray-400",
      };
  }
};

export const ScraperMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<ProviderMetrics[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const wsFailedRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);

  const applyIncomingMetrics = (incomingData: ProviderMetrics[]) => {
    const cache = loadCachedMetrics();
    const merged = mergeIncomingWithCache(incomingData, cache?.metrics || []);

    setMetrics(merged);
    saveCachedMetrics(merged);
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch(WORKER_SCRAPER_STATUS);

      if (response.ok) {
        const data = (await response.json()) as ProviderMetrics[];

        applyIncomingMetrics(data);
      }
    } catch {
      // Silently fail - WebSocket will provide data if available.
    }
  };

  useEffect(() => {
    const cache = loadCachedMetrics();

    if (cache?.metrics?.length) {
      const sortedData = [...cache.metrics].sort((a, b) =>
        a.provider.localeCompare(b.provider),
      );

      setMetrics(sortedData);
    }

    fetchMetrics();
  }, []);

  useEffect(() => {
    if (!WORKER_WS_URL) {
      wsFailedRef.current = true;
      setIsPolling(true);

      return;
    }

    const socket: Socket = io(WORKER_WS_URL, {
      auth: {
        type: WebsocketType.SCRAPER,
      },
      transports: ["websocket"],
      reconnection: true,
      timeout: WS_CONNECTION_TIMEOUT_MS,
    });

    const connectionTimeout = setTimeout(() => {
      if (!isConnectedRef.current && !wsFailedRef.current) {
        wsFailedRef.current = true;
        setIsPolling(true);
      }
    }, WS_CONNECTION_TIMEOUT_MS);

    socket.on("connect", () => {
      wsFailedRef.current = false;
      isConnectedRef.current = true;
      setIsConnected(true);
      setIsPolling(false);
      clearTimeout(connectionTimeout);
      fetchMetrics();
    });

    socket.on("disconnect", () => {
      isConnectedRef.current = false;
      setIsConnected(false);
      setIsPolling(true);
    });

    socket.on("SCRAPER_STATUS_UPDATE", (data: ProviderMetrics[]) => {
      applyIncomingMetrics(data);
    });

    socket.on("connect_error", () => {
      wsFailedRef.current = true;
      setIsPolling(true);
    });

    return () => {
      socket.disconnect();
      clearTimeout(connectionTimeout);
    };
  }, []);

  useEffect(() => {
    if (isPolling && !pollingIntervalRef.current) {
      fetchMetrics();
      pollingIntervalRef.current = setInterval(
        fetchMetrics,
        POLLING_INTERVAL_MS,
      );
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isPolling]);

  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(fetchMetrics, RECONCILIATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      initial={{ opacity: 0, y: 20 }}
    >
      <div className="flex items-center justify-between border-b border-[#44735E]/20 bg-gradient-to-br from-[#44735E] to-[#2a4d3d] px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Monitoramento
          </h3>
        </div>

        <div className="text-right">
          {metrics[0]?.scheduleLabel && (
            <p className="text-sm text-white/90">
              Horários de coleta: {metrics[0].scheduleLabel}
            </p>
          )}
          <p className="text-xs font-medium text-white/70 mt-1">
            Inativação em massa: Todo dia 24 às 18:30
          </p>
        </div>
      </div>

      <div className="p-4">
        {metrics.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            Aguardando dados...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-5">
            {metrics.map((row) => {
              const config = getStatusConfig(row.status);

              return (
                <article
                  key={row.provider}
                  className="rounded-lg bg-white px-3 py-2 border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800">
                          {row.provider}
                        </h4>
                        <span className={`text-[11px] ${row.status === "Processando" ? "text-blue-600" : "text-gray-500"}`}>
                          {row.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                        Recebidos
                      </p>
                      <p className="text-lg font-semibold text-[#44735E]">
                        {row.receivedToday || 0}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </div>
    </motion.div>
  );
};
