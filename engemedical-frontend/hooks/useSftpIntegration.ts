"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SftpDashboardData,
  SftpFileRecord,
  SftpRunRecord,
  SftpKpis,
  SftpScheduleInfo,
} from "@/sftp-integracao/types";

/* ─── Supabase Client ────────────────────────────────── */
/* ─── API Fetcher ────────────────────────────────────── */

async function fetchSftpDashboard(): Promise<SftpDashboardData> {
  const response = await fetch("/api/sftp-integracao");
  if (!response.ok) throw new Error("Falha ao carregar dados SFTP");
  return response.json();
}

/* ─── Hook Principal ──────────────────────────────────── */

export function useSftpIntegration() {
  const [lastError, setLastError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Query para dados do dashboard
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery<SftpDashboardData>({
    queryKey: ["sftp-dashboard"],
    queryFn: fetchSftpDashboard,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Mutation para trigger pull
  const pullMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sftp-integracao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pull" }),
      });
      if (!response.ok) throw new Error("Falha ao iniciar pull");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sftp-dashboard"] });
    },
    onError: (error: Error) => {
      setLastError(error.message);
    },
  });

  /* ─── KPIs ───────────────────────────────────────────── */
  const kpis: SftpKpis = data?.kpis || {
    totalExecutions: 0,
    totalFiles: 0,
    lastExecutionDate: null,
    lastExecutionTime: null,
    lastExecutionStatus: null,
    nextScheduledExecution: null,
    cronEnabled: false,
  };

  /* ─── Files (Planilhas) ─────────────────────────────── */
  const files: SftpFileRecord[] = data?.files || [];
  const recentFiles = files.slice(0, 10);

  /* ─── Runs (Relatórios) ─────────────────────────────── */
  const runs: SftpRunRecord[] = data?.runs || [];
  const recentRuns = runs.slice(0, 10);

  /* ─── Schedule ──────────────────────────────────────── */
  const schedule: SftpScheduleInfo = data?.schedule || {
    cronExpression: "",
    cronEnabled: false,
    timezone: "America/Sao_Paulo",
    lastExecution: null,
    nextExecution: null,
    description: "Carregando...",
  };

  /* ─── Actions ───────────────────────────────────────── */

  const triggerPull = useCallback(async () => {
    setLastError(null);
    await pullMutation.mutateAsync();
  }, [pullMutation]);

  const downloadFile = useCallback(async (fileId: string) => {
    try {
      const response = await fetch("/api/sftp-integracao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "download-file", fileId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Falha ao baixar arquivo");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "sftp-grupo-tora.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
      return { success: true };
    } catch (err) {
      setLastError(err instanceof Error ? err.message : "Falha ao baixar");
      throw err;
    }
  }, []);

  const downloadReport = useCallback(
    async (runId: string) => {
      setLastError(null);
      try {
        const response = await fetch("/api/sftp-integracao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "download-report", runId }),
        });
        if (!response.ok)
          throw new Error(
            (await response.json()).error || "Relatório ainda não disponível",
          );
        const url = URL.createObjectURL(await response.blob());
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `relatorio-sftp-${runId}.xlsx`;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setLastError(
          err instanceof Error ? err.message : "Falha ao baixar relatório",
        );
        throw err;
      }
    },
    [recentRuns],
  );

  return {
    // Data
    kpis,
    files: recentFiles,
    runs: recentRuns,
    schedule,
    // State
    isLoading,
    isPulling: pullMutation.isPending,
    isProcessing: false,
    error:
      lastError ??
      (queryError instanceof Error
        ? queryError.message
        : queryError
          ? "Falha ao carregar dados SFTP"
          : null),
    // Actions
    triggerPull,
    downloadFile,
    downloadReport,
    // Refresh
    refetch,
  };
}
