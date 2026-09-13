"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Database,
  ChevronDown,
  FileCheck2,
  RefreshCw,
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
const SCRAPER_METRICS_CACHE_KEY = "dashboard_scraper_metrics_cache_v2";
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

    return {
      ...parsed,
      metrics: parsed.metrics,
    };
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

export const mergeIncomingWithCache = (
  incoming: ProviderMetrics[],
  cached: ProviderMetrics[],
) => {
  if (!incoming.length) return [];

  const cachedByProvider = new Map(cached.map((item) => [item.provider, item]));

  return incoming
    .map((item) =>
    mergeProviderMetrics(item, cachedByProvider.get(item.provider)),
    )
    .sort((a, b) => a.provider.localeCompare(b.provider));
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
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
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
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_-32px_rgba(15,55,85,0.45)]"
      initial={{ opacity: 0, y: 20 }}
    >
      <div className="flex items-center justify-between border-b border-brand-500/20 bg-gradient-to-br from-brand-500 to-brand-700 px-5 py-4">
        <h3 className="text-lg font-semibold text-white">Monitoramento</h3>

        <div className="text-right">
          <p className="text-xs font-bold text-white">Coleta automática pausada</p>
          <p className="mt-1 text-[11px] text-white/65">
            Pausa temporária para validação da equipe
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {metrics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500">
            <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin text-brand-500" />
            Aguardando informações da coleta...
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600">
                Prestadores acompanhados
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {metrics.map((row) => {
                const config = getStatusConfig(row.status);
                const isExpanded = expandedProvider === row.provider;
                const detailsId = `scraper-provider-details-${row.provider.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

                return (
                  <article key={row.provider} className="border-b border-slate-100 last:border-b-0">
                    <button
                      type="button"
                      aria-controls={detailsId}
                      aria-expanded={isExpanded}
                      className="group flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-400 sm:px-5"
                      onClick={() => setExpandedProvider(isExpanded ? null : row.provider)}
                    >
                      <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center text-brand-600">
                        <Database className="h-5 w-5 transition-colors group-hover:text-brand-700" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-bold text-slate-800 sm:text-base">
                            {row.provider}
                          </h4>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ${row.status === "Erro" ? "bg-red-50 text-red-700" : row.status === "Processando" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
                            {row.status}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {row.lastProcessed ? `Última coleta ${new Date(row.lastProcessed).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : "Nenhuma coleta realizada hoje"}
                        </p>
                      </div>

                      <div className="hidden min-w-[110px] text-right sm:block">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Recebidos hoje
                        </p>
                        <p className="mt-1 text-xl font-bold tracking-tight text-brand-600">
                          {row.receivedToday || 0}
                        </p>
                      </div>

                      <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-180 text-brand-600" : "group-hover:text-brand-600"}`} />
                    </button>

                    <motion.div
                      id={detailsId}
                      animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
                      className="overflow-hidden"
                      initial={false}
                    >
                      <div className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-slate-50/45 px-4 pb-4 pt-3 sm:grid-cols-3 sm:px-5">
                        <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-100">
                          <div className="flex items-center gap-2 text-slate-400">
                            <FileCheck2 className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Exames verificados hoje</span>
                          </div>
                          <p className="mt-2 text-lg font-bold text-slate-800">{row.analyzedToday || 0}</p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-100">
                          <div className="flex items-center gap-2 text-slate-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Resultados recebidos</span>
                          </div>
                          <p className="mt-2 text-lg font-bold text-slate-800">{row.receivedToday || 0}</p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-100">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Próxima atualização</span>
                          </div>
                          <p className="mt-2 text-sm font-bold text-slate-800">Coleta pausada</p>
                        </div>
                      </div>
                    </motion.div>
                  </article>
                );
              })}
            </div>

          </div>
        )}

      </div>
    </motion.div>
  );
};
