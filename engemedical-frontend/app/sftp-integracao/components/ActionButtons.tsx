"use client";

import { motion } from "framer-motion";
import { RefreshCw, Download, BarChart3 } from "lucide-react";
import { Button } from "@heroui/react";

interface ActionButtonsProps {
  isPulling: boolean;
  isProcessing: boolean;
  onTriggerPull: () => void;
  onRefresh?: () => void;
  status?: "empty" | "operational" | "error";
}

export function ActionButtons({
  isPulling,
  isProcessing,
  onTriggerPull,
  onRefresh,
  status = "operational",
}: ActionButtonsProps) {
  const globalLoading = isPulling || isProcessing;
  const statusLabel =
    status === "error"
      ? "Indisponível"
      : status === "empty"
        ? "Sem histórico"
        : "Operacional";
  const description =
    status === "error"
      ? "Verifique o ambiente e tente novamente"
      : status === "empty"
        ? "Aguardando a primeira sincronização"
        : "Pronta para nova sincronização";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 sm:flex-row"
    >
      {/* Primary Action Button */}
      <motion.div className="relative">
        <Button
          color="primary"
          variant="gradient"
          onClick={onTriggerPull}
          disabled={globalLoading}
          isLoading={isPulling}
          className="min-w-[190px] rounded-lg font-semibold shadow-md shadow-brand-700/10"
        >
          <>
            <Download className="mr-2 h-4 w-4" />
            {isPulling ? "Baixando..." : "Baixar Planilha SFTP"}
          </>
        </Button>
        {isPulling && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs">
            1
          </span>
        )}
      </motion.div>

      {/* Secondary Action - Refresh */}
      <Button
        variant="flat"
        color="default"
        onClick={onRefresh}
        disabled={globalLoading}
        className="min-w-[140px] rounded-lg border border-brand-line bg-white text-brand-700 hover:bg-brand-50"
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${isPulling ? "animate-spin" : ""}`}
        />
        Atualizar
      </Button>

      {/* Stats Summary */}
      <div className="flex-1 rounded-xl border border-brand-line bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 text-sm">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
              Status da integração
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-brand-midnight">
              {globalLoading ? "Sincronização em andamento" : description}
            </p>
          </div>
          <span
            className={`ml-auto hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${
              status === "error"
                ? "bg-red-50 text-red-700"
                : status === "empty"
                  ? "bg-brand-100 text-brand-700"
                  : "bg-brand-green-50 text-brand-green-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === "error"
                  ? "bg-red-500"
                  : status === "empty"
                    ? "bg-brand-500"
                    : "bg-brand-green-500"
              }`}
            />
            {statusLabel}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
