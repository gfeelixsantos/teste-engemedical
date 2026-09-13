"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Calendar,
  FileDown,
  FileUp,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { SftpFileRecord, SftpKpis } from "@/sftp-integracao/types";
import {
  formatFileSize,
  formatShortDate,
  getStatusLabel,
} from "@/lib/sftp-utils";

interface ExecutionTableProps {
  files: SftpFileRecord[];
  isPulling: boolean;
  onDownload: (fileId: string) => void;
}

export function ExecutionTable({
  files,
  isPulling,
  onDownload,
}: ExecutionTableProps) {
  if (files.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-brand-line bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileText className="mb-3 h-8 w-8 text-brand-400" />
          <h3 className="font-display text-base font-bold text-brand-midnight">
            Nenhuma planilha recebida
          </h3>
          <p className="mt-1 text-sm text-brand-muted">
            Conecte-se ao SFTP Grupo Tora para começar a receber planilhas
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
          Planilhas Recebidas
        </h2>
        <p className="text-sm text-brand-muted">
          Últimas {files.length} planilhas recebidas
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] divide-y divide-brand-line">
          <thead className="bg-brand-surface/70">
            <tr>
              <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">
                Arquivo
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">
                Status
              </th>
              <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">
                Tamanho
              </th>
              <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">
                Data
              </th>
              <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {files.map((file, index) => (
              <motion.tr
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="transition-colors hover:bg-brand-surface/60"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <FileDown className="h-4 w-4 text-brand-500" />
                    <span className="max-w-[200px] truncate text-sm font-medium text-brand-midnight">
                      {file.remoteName}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColorClass(file.status)}`}
                  >
                    {getStatusIcon(file.status)}
                    {statusLabel(file.status)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-sm text-brand-muted">
                  {formatFileSize(file.size)}
                </td>
                <td className="px-5 py-3 text-right text-sm text-brand-muted">
                  {formatShortDate(file.createdAt)}
                </td>
                <td className="px-5 py-3 text-center">
                  <button
                    onClick={() => onDownload(file.id)}
                    disabled={isPulling || file.status !== "downloaded"}
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-brand-600 transition-colors hover:bg-brand-100 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Baixar planilha"
                  >
                    <Download className="h-4 w-4" />
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
    downloaded: "bg-emerald-100 text-emerald-800",
    parsed: "bg-blue-100 text-blue-800",
    error: "bg-red-100 text-red-800",
    downloading: "bg-amber-100 text-amber-800",
    processing: "bg-indigo-100 text-indigo-800",
    processed: "bg-emerald-100 text-emerald-800",
    default: "bg-gray-100 text-gray-800",
  };
  return colors[status] || colors.default;
}

function getStatusIcon(status: string): JSX.Element {
  const icons: Record<string, JSX.Element> = {
    downloaded: <CheckCircle className="h-3 w-3" />,
    parsed: <FileText className="h-3 w-3" />,
    error: <AlertCircle className="h-3 w-3" />,
    downloading: <Clock className="h-3 w-3" />,
    processing: <Clock className="h-3 w-3" />,
    processed: <CheckCircle className="h-3 w-3" />,
    default: <Calendar className="h-3 w-3" />,
  };
  return icons[status] || icons.default;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    downloaded: "Baixado",
    parsed: "Parseado",
    error: "Erro",
    downloading: "Baixando",
    processing: "Processando",
    processed: "Processado",
    default: "Desconhecido",
  };
  return labels[status] || status;
}
