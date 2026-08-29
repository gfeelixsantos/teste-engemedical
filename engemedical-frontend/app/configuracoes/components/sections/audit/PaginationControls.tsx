"use client";

import { AuditPaginationMeta } from "@/lib/audit-log/types";

interface PaginationControlsProps {
  pagination: AuditPaginationMeta;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

export function PaginationControls({
  pagination,
  onPageChange,
  isLoading,
}: PaginationControlsProps) {
  const isFirstPage = pagination.page === 1;
  const isLastPage =
    pagination.page >= pagination.totalPages || pagination.totalPages === 0;

  return (
    <div className="flex flex-row gap-2 items-center text-sm">
      <button
        onClick={() => onPageChange(pagination.page - 1)}
        disabled={isFirstPage || isLoading}
        className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Anterior
      </button>

      <span>
        Página {pagination.page} de {pagination.totalPages}
      </span>

      <span className="text-gray-500">Total: {pagination.total} registros</span>

      <button
        onClick={() => onPageChange(pagination.page + 1)}
        disabled={isLastPage || isLoading}
        className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Próxima
      </button>
    </div>
  );
}
