"use client";

import type { FuncionarioStatus } from "@/lib/cliente/funcionarios/types";

export const FUNCIONARIO_STATUS_OPTIONS: Array<{
  value: FuncionarioStatus;
  label: string;
}> = [
  { value: "ATENDIMENTO", label: "ATENDIMENTO" },
  { value: "AGUARDANDO_RESULTADOS", label: "AGUARDANDO_RESULTADOS" },
  { value: "AVALIACAO_MEDICA", label: "AVALIACAO_MEDICA" },
  { value: "AGENDADO", label: "AGENDADO" },
  { value: "PENDENTE", label: "PENDENTE" },
  { value: "EXPIRADO", label: "EXPIRADO" },
  { value: "EXPIRANDO", label: "EXPIRANDO" },
  { value: "VALIDO", label: "VALIDO" },
];

interface FuncionariosFiltersProps {
  query: string;
  status: FuncionarioStatus | "";
  limit: number;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: FuncionarioStatus | "") => void;
  onLimitChange: (value: number) => void;
}

export function FuncionariosFilters({
  query,
  status,
  limit,
  onQueryChange,
  onStatusChange,
  onLimitChange,
}: FuncionariosFiltersProps) {
  return (
    <div className="grid gap-4 rounded-2xl border border-[#CBE3D3] bg-white p-4 shadow-[0_12px_30px_rgba(47,125,86,0.06)] md:grid-cols-[minmax(0,1fr)_220px_140px]">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5E7F6C]" htmlFor="funcionarios-search">
          Buscar funcionário
        </label>
        <input
          id="funcionarios-search"
          aria-label="Buscar por nome, código ou matrícula"
          className="h-10 rounded-xl border border-[#C5E2D0] bg-[#F9FDFC] px-3 text-sm text-[#173D2B] outline-none transition focus:border-[#16804D] focus:ring-2 focus:ring-[#16804D]/20"
          placeholder="Buscar por nome, código ou matrícula"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5E7F6C]" htmlFor="funcionarios-status">
          Status
        </label>
        <select
          id="funcionarios-status"
          className="h-10 rounded-xl border border-[#C5E2D0] bg-[#F9FDFC] px-3 text-sm text-[#173D2B] outline-none transition focus:border-[#16804D] focus:ring-2 focus:ring-[#16804D]/20"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as FuncionarioStatus | "")}
        >
          <option value="">Todos</option>
          {FUNCIONARIO_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5E7F6C]" htmlFor="funcionarios-limit">
          Exibir por página
        </label>
        <select
          id="funcionarios-limit"
          className="h-10 rounded-xl border border-[#C5E2D0] bg-[#F9FDFC] px-3 text-sm text-[#173D2B] outline-none transition focus:border-[#16804D] focus:ring-2 focus:ring-[#16804D]/20"
          value={limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
        >
          {[10, 25, 50, 100].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {pageSize}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
