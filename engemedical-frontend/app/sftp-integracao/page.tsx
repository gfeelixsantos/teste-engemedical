"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Clock,
  Plus,
  Play,
  CheckCircle2,
  Server,
  ChevronRight,
} from "lucide-react";
import { Button } from "@heroui/react";

import { AppShell } from "@/components/shared/AppShell";
import AppLoading from "@/components/shared/AppLoading";
import { useSftpIntegration } from "@/hooks/useSftpIntegration";
import { KpiCards } from "./components/KpiCards";
import { ExecutionTable } from "./components/ExecutionTable";
import { ReportsTable } from "./components/ReportsTable";
import { ScheduleInfo } from "./components/ScheduleInfo";

/* ─── Page Component ──────────────────────────────────── */

export default function SftpIntegracaoPage() {
  const router = useRouter();
  const {
    kpis,
    files,
    runs,
    schedule,
    isLoading,
    isPulling,
    isProcessing,
    error,
    triggerPull,
    downloadFile,
    downloadReport,
    refetch,
  } = useSftpIntegration();

  const [currentTime, setCurrentTime] = useState<string>("");
  const hasHistory =
    kpis.totalExecutions > 0 || files.length > 0 || runs.length > 0;
  const integrationStatus: "empty" | "operational" | "error" = error
    ? "error"
    : hasHistory
      ? "operational"
      : "empty";
  useEffect(() => {
    const update = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppShell
      onLogout={() => {
        localStorage.removeItem("user");
        router.push("/login");
      }}
    >
      <div
        className="px-4 py-4 sm:px-6 lg:px-8"
        role="main"
      >
        <div className="mx-auto max-w-[1440px]">
          {/* Loading State */}
          {isLoading ? (
            <AppLoading title="Carregando integração" description="Preparando ambiente..." />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2 text-sm text-brand-muted">
                <span>Integrações</span>
                <ChevronRight className="h-4 w-4" />
                <span className="font-semibold text-brand-midnight">
                  SFTP
                </span>
              </div>
              <section className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-midnight">
                    Integrações SFTP
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm text-brand-muted">
                    Acompanhe o status das integrações, visualize as execuções
                    e os arquivos processados.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-brand-muted">
                  <Clock className="h-4 w-4 text-brand-600" /> Atualizado às{" "}
                  {currentTime}
                </div>
              </section>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[230px_minmax(0,1fr)]">
                <aside className="rounded-2xl border border-brand-line bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between px-2 py-2">
                    <h2 className="font-display text-base font-bold text-brand-midnight">
                      Integrações
                    </h2>
                    <button
                      type="button"
                      aria-label="Adicionar integração"
                      className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="mt-2 flex w-full items-center gap-3 rounded-xl border-l-2 border-brand-cyan bg-brand-cyan-50 px-3 py-3 text-left"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-midnight text-xs font-bold text-white">
                      GT
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-brand-midnight">
                        Grupo Tora
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-brand-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-green-500" />{" "}
                        {schedule.cronEnabled ? "Ativa" : "Pausada"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-brand-600" />
                  </button>
                  <div className="mt-8 border-t border-brand-line px-2 pt-5 text-center">
                    <Server className="mx-auto h-7 w-7 text-brand-300" />
                    <p className="mt-3 text-xs font-semibold text-brand-muted">
                      Novas integrações
                    </p>
                    <p className="mt-1 text-xs leading-5 text-brand-muted">
                      O sistema está preparado para múltiplos parceiros SFTP.
                    </p>
                  </div>
                </aside>

                <div className="min-w-0 rounded-2xl border border-brand-line bg-white shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-brand-line p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-midnight text-sm font-bold text-white">
                        GT
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-display text-xl font-bold text-brand-midnight">
                            Grupo Tora
                          </h2>
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-50 px-2 py-1 text-xs font-semibold text-brand-green-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-green-500" />{" "}
                            {schedule.cronEnabled ? "Ativa" : "Pausada"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-brand-muted">
                          Integração SFTP para troca de arquivos com o Grupo
                          Tora.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={triggerPull}
                      disabled={isPulling}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-cyan px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
                    >
                      <Play className="h-4 w-4 fill-current" />{" "}
                      {isPulling ? "Executando..." : "Executar agora"}
                    </button>
                  </div>
                  <div className="border-b border-brand-line bg-brand-green-50/60 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-brand-green-600" />
                      <div>
                        <p className="text-sm font-bold text-brand-midnight">
                          {schedule.cronEnabled ? "Integração operacional" : "Integração pausada"}
                        </p>
                        <p className="text-xs text-brand-muted">
                          {schedule.cronEnabled
                            ? "Arquivos e relatórios são acompanhados automaticamente."
                            : "O agendamento automático está pausado no momento."}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="mb-5">
                      <KpiCards kpis={kpis} />
                    </div>
                    <div className="mb-5 flex items-center justify-between border-b border-brand-line pb-3">
                      <div className="flex gap-6 text-sm font-semibold">
                        <span className="border-b-2 border-brand-cyan pb-3 text-brand-700">
                          Arquivos e execuções
                        </span>
                        <span className="text-brand-muted">Agendamento</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-brand-700 hover:text-brand-900"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Atualizar
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
                      <ExecutionTable
                        files={files}
                        isPulling={isPulling}
                        onDownload={downloadFile}
                      />
                      <ReportsTable
                        runs={runs}
                        isProcessing={isProcessing}
                        onDownload={downloadReport}
                      />
                    </div>
                    <div className="mt-5">
                      <ScheduleInfo schedule={schedule} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Toast */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed bottom-6 right-6 z-50 rounded-xl border border-red-200 bg-red-50 p-4 shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-red-600">⚠️</span>
                    <p className="text-sm text-red-700">{error}</p>
                    <Button
                      variant="flat"
                      color="default"
                      size="sm"
                      onClick={() => refetch()}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* ─── Sub-components ──────────────────────────────────── */

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-xl border border-red-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-600">
        <span className="text-3xl">⚠️</span>
      </div>
      <h2 className="font-display text-xl font-bold text-brand-midnight">
        Erro ao carregar dados
      </h2>
      <p className="mt-2 max-w-sm text-sm text-brand-muted">{error}</p>
      <Button color="primary" variant="flat" className="mt-4" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Tentar novamente
      </Button>
    </div>
  );
}
