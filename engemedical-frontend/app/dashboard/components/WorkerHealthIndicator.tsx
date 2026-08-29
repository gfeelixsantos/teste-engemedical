"use client";

import { AlertCircle, Cpu, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

import { useWorkerHealth } from "@/hooks/useWorkerHealth";

function StatusDot({ status }: { status: "online" | "offline" | "degraded" }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        status === "online"
          ? "bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]"
          : status === "degraded"
            ? "bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]"
            : "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)] animate-pulse"
      }`}
    />
  );
}

export function WorkerHealthIndicator() {
  const { data, loading, error, refetch } = useWorkerHealth({
    refreshInterval: 60000,
  });

  if (loading && !data) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
        <Cpu className="h-3.5 w-3.5 animate-pulse text-gray-400" />
        <span className="text-[11px] text-gray-400">
          Verificando workers...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50/50 px-3 py-2">
        <AlertCircle className="h-3.5 w-3.5 text-red-400" />
        <span className="text-[11px] text-red-500">
          Erro ao verificar saúde dos workers
        </span>
        <button
          className="ml-auto text-red-400 transition-colors hover:text-red-600"
          type="button"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { cmso360Worker, asoProcessingQueue, asoEnriquecimentoQueue } = data;
  const workerOnline = cmso360Worker.status === "online";

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2"
      initial={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
    >
      <Cpu className="h-3.5 w-3.5 text-gray-400" />

      <div className="flex items-center gap-1.5">
        <StatusDot status={workerOnline ? "online" : "offline"} />
        <span
          className={`text-[11px] font-medium ${
            workerOnline ? "text-green-700" : "text-red-600"
          }`}
        >
          Worker {workerOnline ? "online" : "offline"}
        </span>
      </div>

      {workerOnline && cmso360Worker.latencyMs > 0 && (
        <span className="text-[10px] text-gray-400">
          {cmso360Worker.latencyMs}ms
        </span>
      )}

      <div className="mx-1 h-3 w-px bg-gray-200" />

      <div className="flex items-center gap-3">
        <span className="text-[10px] text-gray-500">
          ASO:{" "}
          <strong
            className={
              asoProcessingQueue.approximateMessagesCount > 0
                ? "text-amber-600"
                : "text-gray-700"
            }
          >
            {asoProcessingQueue.approximateMessagesCount}
          </strong>
          {asoProcessingQueue.dlqCount > 0 && (
            <span className="ml-1 text-red-500">
              (DLQ: {asoProcessingQueue.dlqCount})
            </span>
          )}
        </span>
        <span className="text-[10px] text-gray-500">
          Enriquecimento:{" "}
          <strong
            className={
              asoEnriquecimentoQueue.approximateMessagesCount > 0
                ? "text-amber-600"
                : "text-gray-700"
            }
          >
            {asoEnriquecimentoQueue.approximateMessagesCount}
          </strong>
          {asoEnriquecimentoQueue.dlqCount > 0 && (
            <span className="ml-1 text-red-500">
              (DLQ: {asoEnriquecimentoQueue.dlqCount})
            </span>
          )}
        </span>
      </div>

      {!workerOnline && (
        <div className="ml-auto flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-0.5">
          <AlertCircle className="h-3 w-3 text-red-500" />
          <span className="text-[10px] font-medium text-red-600">
            Worker offline
          </span>
        </div>
      )}

      <button
        className="ml-auto text-gray-300 transition-colors hover:text-gray-500"
        type="button"
        onClick={() => refetch()}
      >
        <RefreshCw className="h-3 w-3" />
      </button>
    </motion.div>
  );
}
