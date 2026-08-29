"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AuditLogsRequestError,
  fetchAuditLogs,
} from "@/lib/audit-log/audit-log.service";
import { IUserInfo } from "@/lib/user/interfaces/IUser";
import {
  AuditFilterParams,
  AuditLogRecord,
  AuditPaginationMeta,
} from "@/lib/audit-log/types";
import { Card, CardBody, CardHeader } from "@heroui/react";
import { ShieldCheck } from "lucide-react";
import CmsoCircularLoading from "@/components/shared/CmsoCircularLoading";
import { AuditFilterForm } from "./audit/AuditFilterForm";
import { AuditLogsTable } from "./audit/AuditLogsTable";
import { resolveAuditLogsErrorBehavior } from "./audit/error-behavior.mjs";
import { PaginationControls } from "./audit/PaginationControls";

interface AuditoriaSectionProps {
  user: IUserInfo;
}

const DEFAULT_PAGINATION: AuditPaginationMeta = {
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0,
};

export function AuditoriaSection({ user }: AuditoriaSectionProps) {
  const router = useRouter();

  const [records, setRecords] = useState<AuditLogRecord[]>([]);
  const [pagination, setPagination] =
    useState<AuditPaginationMeta>(DEFAULT_PAGINATION);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<
    Partial<AuditFilterParams>
  >({});
  const [hasSearched, setHasSearched] = useState(false);

  // Redirect non-MASTER users
  useEffect(() => {
    if (user.perfil !== "MASTER") {
      router.replace("/configuracoes");
    }
  }, [user.perfil, router]);

  async function loadLogs(
    filters: Partial<AuditFilterParams>,
    page: number,
  ) {
    setIsLoading(true);
    setError(null);

    try {
      const params: AuditFilterParams = {
        page,
        limit: 50,
        ...filters,
      };

      const response = await fetchAuditLogs(params);
      setRecords(response.data);
      setPagination(response.pagination);
    } catch (err) {
      if (err instanceof AuditLogsRequestError) {
        const behavior = resolveAuditLogsErrorBehavior(err.status, err.message);

        if (behavior.redirectTo) {
          router.replace(behavior.redirectTo);
          return;
        }

        setError(behavior.message);
      } else {
        setError("Erro ao carregar registros de histórico.");
      }
      setRecords([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilter(filters: Partial<AuditFilterParams>) {
    setActiveFilters(filters);
    setHasSearched(true);
    loadLogs(filters, 1);
  }

  function handleClearFilters() {
    setActiveFilters({});
    setHasSearched(false);
    setRecords([]);
    setPagination(DEFAULT_PAGINATION);
    setError(null);
  }

  function handlePageChange(page: number) {
    loadLogs(activeFilters, page);
  }

  // Don't render anything for non-MASTER (redirect is in progress)
  if (user.perfil !== "MASTER") {
    return null;
  }

  return (
    <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <ShieldCheck className="h-5 w-5 text-[#44735e]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Auditoria Operacional
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Consulte e filtre os registros de ações operacionais do sistema.
          </p>
        </div>
      </CardHeader>

      <CardBody className="p-6 pt-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Filtros</h3>
            <AuditFilterForm onFilter={handleFilter} onClear={handleClearFilters} isLoading={isLoading} />
          </div>

          {/* Error state */}
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm"
            >
              {error}
            </div>
          )}

          {/* Empty state - before first search */}
          {!hasSearched && !error && !isLoading && (
            <div className="text-center py-12 text-gray-400">
              <ShieldCheck size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Utilize os filtros acima para buscar registros de auditoria.</p>
            </div>
          )}

          {/* Loading overlay on table */}
          {hasSearched && isLoading && records.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <CmsoCircularLoading iconSize={40} fullHeight={false} />
            </div>
          )}

          {/* Table */}
          {hasSearched && !isLoading && (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <AuditLogsTable records={records} isLoading={isLoading} />
            </div>
          )}

          {/* Table loading (shows skeleton while fetching more pages) */}
          {hasSearched && isLoading && records.length > 0 && (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <AuditLogsTable records={records} isLoading={isLoading} />
            </div>
          )}

          {/* Pagination */}
          {hasSearched && !isLoading && records.length > 0 && (
            <PaginationControls
              pagination={pagination}
              onPageChange={handlePageChange}
              isLoading={isLoading}
            />
          )}
        </div>
      </CardBody>
    </Card>
  );
}
