"use client";

import { useMemo, useState } from "react";
import { addToast, Button, Input, Spinner } from "@heroui/react";
import {
  Search,
  RotateCw,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useQueueMonitor, QUEUE_WORKER_MAP } from "@/hooks/useQueueMonitor";
import { QueueDetailPanel } from "./QueueDetailPanel";

export const QueueMonitor: React.FC = () => {
  const { data, loading, isRefreshing, error, refetch } = useQueueMonitor({
    autoRefresh: true,
    refreshInterval: 15000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedQueue, setExpandedQueue] = useState<string | null>(null);

  const filteredQueues = useMemo(() => {
    if (!data?.queues) return [];

    let queues = data.queues;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      queues = queues.filter((queue) => {
        const info = QUEUE_WORKER_MAP[queue.name];
        return (
          queue.name.toLowerCase().includes(q) ||
          (info?.label || "").toLowerCase().includes(q) ||
          (info?.description || "").toLowerCase().includes(q)
        );
      });
    }

    return queues.sort((a, b) => a.name.localeCompare(b.name));
  }, [data, searchQuery]);

  const stats = useMemo(() => {
    if (!data?.queues) {
      return { total: 0, totalMessages: 0, activeQueues: 0, emptyQueues: 0 };
    }

    const queues = data.queues;
    const totalMessages = data.totalMessages;
    const activeQueues = queues.filter(
      (q) => q.approximateMessagesCount > 0,
    ).length;
    const emptyQueues = queues.filter(
      (q) => q.approximateMessagesCount === 0,
    ).length;

    return {
      total: queues.length,
      totalMessages,
      activeQueues,
      emptyQueues,
    };
  }, [data]);

  const handleRefresh = () => {
    refetch();
    addToast({
      title: "Atualizado",
      description: "Filas atualizadas com sucesso.",
      severity: "success",
      color: "foreground",
      variant: "flat",
    });
  };

  const toggleQueue = (queueName: string) => {
    setExpandedQueue(expandedQueue === queueName ? null : queueName);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Section */}
      <div className="rounded-xl bg-gradient-to-br from-[#44735E] to-[#2a4d3d] p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Monitor de Filas
            </h3>
            <p className="mt-1 text-sm text-white/70">
              Azure Queue Storage — Acompanhamento em tempo real
            </p>
          </div>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="text-white/70 hover:text-white"
            onPress={handleRefresh}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="h-1 bg-gradient-to-r from-[#44735E] to-[#2a4d3d]" />
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Filas
                </p>
                <p className="mt-1 text-3xl font-bold text-[#44735E]">
                  {stats.total}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#44735E]/10 text-[#44735E]">
                <Inbox className="h-6 w-6" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Mensagens
                </p>
                <p className="mt-1 text-3xl font-bold text-amber-600">
                  {stats.totalMessages}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="h-1 bg-gradient-to-r from-[#44735E] to-[#2a4d3d]" />
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Em Processamento
                </p>
                <p className="mt-1 text-3xl font-bold text-[#44735E]">
                  {stats.activeQueues}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#44735E]/10 text-[#44735E]">
                <RefreshCw className="h-6 w-6" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="h-1 bg-gradient-to-r from-green-400 to-green-500" />
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Vazias</p>
                <p className="mt-1 text-3xl font-bold text-green-600">
                  {stats.emptyQueues}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-500">
                <Inbox className="h-6 w-6" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="Buscar fila..."
          size="sm"
          startContent={<Search className="h-4 w-4 text-gray-400" />}
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
      </div>

      {/* Queue List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Spinner color="primary" size="lg" />
            <p className="mt-3 text-sm">Carregando filas...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-red-500">
            <AlertTriangle className="mb-3 h-10 w-10" />
            <p className="text-sm font-medium">Erro ao carregar filas</p>
            <p className="mt-1 text-xs text-gray-400">{error.message}</p>
            <Button
              className="mt-4"
              color="primary"
              size="sm"
              variant="flat"
              onPress={handleRefresh}
            >
              Tentar novamente
            </Button>
          </div>
        ) : filteredQueues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Inbox className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium">
              {searchQuery
                ? "Nenhuma fila encontrada para a busca."
                : "Nenhuma fila configurada."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredQueues.map((queue, index) => {
              const info = QUEUE_WORKER_MAP[queue.name];
              const isExpanded = expandedQueue === queue.name;
              const hasMessages = queue.approximateMessagesCount > 0;

              return (
                <motion.div
                  key={queue.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                >
                  {/* Queue Row */}
                  <div
                    className={`cursor-pointer transition-colors duration-150 ${
                      isExpanded
                        ? "bg-[#44735E]/5"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => toggleQueue(queue.name)}
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Status Indicator */}
                      <div
                        className={`h-3 w-3 rounded-full ${
                          hasMessages
                            ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                            : "bg-green-400"
                        }`}
                      />

                      {/* Icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#44735E]/10 text-[#44735E]">
                        {hasMessages ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <Inbox className="h-5 w-5" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-800">
                            {info?.label || queue.name}
                          </h4>
                          {hasMessages && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              {queue.approximateMessagesCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {info?.description || queue.name}
                        </p>
                      </div>

                      {/* Worker Badge */}
                      <div className="hidden items-center gap-2 sm:flex">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600">
                          {info?.consumer || "—"}
                        </span>
                      </div>

                      {/* Count */}
                      <div className="text-right">
                        <p
                          className={`text-2xl font-bold ${
                            hasMessages ? "text-amber-600" : "text-green-600"
                          }`}
                        >
                          {queue.approximateMessagesCount}
                        </p>
                        <p className="text-[10px] text-gray-400">mensagens</p>
                      </div>

                      {/* Chevron */}
                      <div className="text-gray-400">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <div className="border-t border-[#44735E]/10 bg-[#f5f9f7] px-5 py-4">
                        <QueueDetailPanel
                          queueName={queue.name}
                          messageCount={queue.approximateMessagesCount}
                          onClose={() => setExpandedQueue(null)}
                        />
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
          <span>
            {filteredQueues.length} fila
            {filteredQueues.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <RotateCw className="h-3 w-3" />
            Atualiza a cada 15s
          </span>
        </div>
      </div>
    </div>
  );
};
