"use client";

import type { FuncionarioStatus } from "@/lib/cliente/funcionarios/types";

interface FuncionarioStatusBadgeProps {
  status: FuncionarioStatus;
  statusLabel: string;
}

const statusClasses: Record<FuncionarioStatus, string> = {
  ATENDIMENTO: "border-sky-200 bg-sky-50 text-sky-700",
  AGUARDANDO_RESULTADOS: "border-amber-200 bg-amber-50 text-amber-700",
  AVALIACAO_MEDICA: "border-violet-200 bg-violet-50 text-violet-700",
  AGENDADO: "border-indigo-200 bg-indigo-50 text-indigo-700",
  PENDENTE: "border-orange-200 bg-orange-50 text-orange-700",
  EXPIRADO: "border-red-200 bg-red-50 text-red-700",
  EXPIRANDO: "border-yellow-200 bg-yellow-50 text-yellow-700",
  VALIDO: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function FuncionarioStatusBadge({ status, statusLabel }: FuncionarioStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
    >
      {statusLabel}
    </span>
  );
}
