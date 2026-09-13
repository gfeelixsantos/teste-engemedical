"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { SftpRunRecord } from "@/sftp-integracao/types";
import { formatShortDate, formatTime, getStatusLabel } from "@/lib/sftp-utils";

interface ReportsTableProps {
  runs: SftpRunRecord[];
  isProcessing: boolean;
  onDownload: (runId: string) => void;
}

export function ReportsTable({
  runs,
  isProcessing,
  onDownload,
}: ReportsTableProps) {
  if (runs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-brand-line bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileText className="mb-3 h-8 w-8 text-brand-400" />
          <h3 className="font-display text-base font-bold text-brand-midnight">
            Nenhum relatório gerado
          </h3>
          <p className="mt-1 text-sm text-brand-muted">
            Aguarde a primeira execução do processamento SOC
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-brand-line bg-white shadow-sm"
    >
      <div className="border-b border-brand-line bg-brand-surface/60 px-5 py-3">
        <h2 className="font-display text-base font-bold text-brand-700">
          Histórico de Execuções
        </h2>
        <p className="text-sm text-brand-muted">
          Últimas {runs.length} execuções processadas
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] divide-y divide-brand-line">
          <thead className="bg-brand-surface/70">
            <tr>
              <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">
                Execução
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">
                Status
              </th>
              <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">
                Resumo
              </th>
              <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">
                Data/Hora
              </th>
              <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {runs.map((run, index) => (
              <motion.tr
                key={run.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="transition-colors hover:bg-brand-surface/60"
              >
                <td className="px-5 py-3">
                  <span className="text-sm font-medium text-brand-midnight">
                    Execução #{runs.length - index}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColorClass(run.status)}`}
                  >
                    {getStatusIcon(run.status)}
                    {getStatusLabel(run.status)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-sm">
                  {renderSummary(run)}
                </td>
                <td className="px-5 py-3 text-right text-sm text-brand-muted">
                  {formatShortDate(run.createdAt)}
                  <br />
                  <span className="text-xs text-brand-muted">
                    {formatTime(run.createdAt)}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <button
                    onClick={() => onDownload(run.id)}
                    disabled={isProcessing}
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-brand-600 transition-colors hover:bg-brand-100 hover:text-brand-800"
                    aria-label="Baixar relatório"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function getStatusColorClass(status: string): string {
  const colors: Record<string, string> = {
    processed: "bg-emerald-100 text-emerald-800",
    soc_limited: "bg-teal-100 text-teal-800",
    parsed: "bg-blue-100 text-blue-800",
    error: "bg-red-100 text-red-800",
    dry_run: "bg-amber-100 text-amber-800",
    default: "bg-gray-100 text-gray-800",
  };
  return colors[status] || colors.default;
}

function getStatusIcon(status: string): JSX.Element {
  const icons: Record<string, JSX.Element> = {
    processed: <CheckCircle className="h-3 w-3" />,
    soc_limited: <FileText className="h-3 w-3" />,
    parsed: <FileText className="h-3 w-3" />,
    error: <AlertCircle className="h-3 w-3" />,
    dry_run: <Loader2 className="h-3 w-3 animate-spin" />,
    default: <Calendar className="h-3 w-3" />,
  };
  return icons[status] || icons.default;
}

function renderSummary(run: SftpRunRecord): JSX.Element {
  if (!run.summary) {
    return <span className="text-brand-muted">---</span>;
  }

  const { totalRows, successCount, errorCount, notInBaseCount } =
    run.summary as any;

  const parts = [];
  if (successCount) parts.push(`Sucesso: ${successCount}`);
  if (errorCount) parts.push(`Erros: ${errorCount}`);
  if (notInBaseCount) parts.push(`Não na base: ${notInBaseCount}`);

  return (
    <div className="text-right">
      <div className="text-sm text-brand-muted">
        {parts.length > 0
          ? parts.join(", ")
          : `Total: ${totalRows || "-"} linhas`}
      </div>
    </div>
  );
}
