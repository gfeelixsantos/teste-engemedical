"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight, Users } from "lucide-react";

import { useEmpresas } from "@/components/cliente/EmpresaProvider";
import LoadingState from "@/components/shared/LoadingState";
import { PremiumFeedbackModal } from "@/components/shared/PremiumFeedbackModal";
import { useClienteFuncionarios } from "@/hooks/useClienteFuncionarios";
import type { FuncionarioStatus } from "@/lib/cliente/funcionarios/types";

import { FuncionariosFilters } from "./FuncionariosFilters";
import { FuncionariosTable } from "./FuncionariosTable";

function NoCompanyState() {
  return (
    <div className="flex min-h-[420px] items-center justify-center px-6 py-12">
      <div className="max-w-md rounded-3xl border border-[#CBE3D3] bg-white px-8 py-10 text-center shadow-[0_20px_50px_rgba(47,125,86,0.08)]">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#E5F3EA] text-[#16804D]">
          <Building2 aria-hidden="true" className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-[#173D2B]">Nenhuma empresa selecionada</h1>
        <p className="mt-2 text-sm leading-6 text-[#5E7F6C]">
          Selecione uma empresa no menu lateral para consultar seus funcionários.
        </p>
      </div>
    </div>
  );
}

function getErrorCopy(kind: "access" | "upstream" | "unknown") {
  if (kind === "access") {
    return { title: "Acesso não disponível", variant: "warning" as const };
  }
  if (kind === "upstream") {
    return { title: "Serviço temporariamente indisponível", variant: "error" as const };
  }
  return { title: "Não foi possível carregar os funcionários", variant: "error" as const };
}

function SelectedEmpresaWorkspace({
  empresa,
}: {
  empresa: { codigo: string; nome: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FuncionarioStatus | "">("");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("empresa", empresa.codigo);
    router.replace(`${pathname}?${searchParams.toString()}`, { scroll: false });
  }, [empresa.codigo, pathname, router]);

  const { data, isLoading, error, refetch } = useClienteFuncionarios({
    empresaCodigo: empresa.codigo,
    page,
    limit,
    q: query || undefined,
    status: status || undefined,
  });

  useEffect(() => {
    if (error) setIsErrorDismissed(false);
  }, [error]);

  const visibleData = data?.empresa.codigo === empresa.codigo ? data : null;
  const totalPages = Math.max(1, Math.ceil((visibleData?.total ?? 0) / limit));
  const errorCopy = error ? getErrorCopy(error.kind) : null;
  const companyName = empresa.nome || visibleData?.empresa.nome || "empresa selecionada";

  const retry = () => {
    setIsErrorDismissed(false);
    refetch();
  };

  return (
    <main className="min-h-full bg-[#F9FDFC] px-4 py-6 text-[#173D2B] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-[#CBE3D3] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(47,125,86,0.06)] sm:px-7">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#E5F3EA] text-[#16804D]">
              <Users aria-hidden="true" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#16804D]">Gestão de pessoas</p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-[#173D2B] sm:text-3xl">Funcionários</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5E7F6C]">
                Acompanhe a situação ocupacional dos funcionários de <span className="font-semibold text-[#2F7D56]">{companyName}</span> em uma visão única e segura.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#E3F0E7] pt-4 text-sm text-[#5E7F6C]">
            <span className="font-semibold text-[#173D2B]">{visibleData?.total ?? 0} funcionários</span>
            <span>Dados somente para consulta</span>
          </div>
        </header>

        <FuncionariosFilters
          limit={limit}
          query={query}
          status={status}
          onLimitChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
          onQueryChange={(nextQuery) => {
            setQuery(nextQuery);
            setPage(1);
          }}
          onStatusChange={(nextStatus) => {
            setStatus(nextStatus);
            setPage(1);
          }}
        />

        <section aria-live="polite" className="mt-6">
          {isLoading && !visibleData ? (
            <LoadingState
              description="Estamos consultando os funcionários da empresa selecionada."
              title="Carregando funcionários"
              variant="section"
            />
          ) : visibleData?.items.length ? (
            <FuncionariosTable items={visibleData.items} />
          ) : (
            <div className="rounded-2xl border border-dashed border-[#B9DCC7] bg-white px-6 py-12 text-center">
              <Users aria-hidden="true" className="mx-auto h-10 w-10 text-[#8AB99A]" />
              <h2 className="mt-4 text-lg font-semibold text-[#173D2B]">Nenhum funcionário encontrado</h2>
              <p className="mt-2 text-sm text-[#5E7F6C]">Ajuste a busca ou os filtros para consultar outros registros.</p>
            </div>
          )}
        </section>

        <footer className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#CBE3D3] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#5E7F6C]" aria-live="polite">Página {page} de {totalPages}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#C5E2D0] px-3 text-sm font-semibold text-[#2F7D56] transition hover:bg-[#E5F3EA] focus:outline-none focus:ring-2 focus:ring-[#16804D]/30 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#C5E2D0] px-3 text-sm font-semibold text-[#2F7D56] transition hover:bg-[#E5F3EA] focus:outline-none focus:ring-2 focus:ring-[#16804D]/30 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!visibleData?.hasNextPage || isLoading}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </div>

      {error && errorCopy && (
        <PremiumFeedbackModal
          detail="Tente novamente ou volte mais tarde."
          isOpen={!isErrorDismissed}
          message={error.message}
          primaryLabel="Tentar novamente"
          title={errorCopy.title}
          variant={errorCopy.variant}
          onClose={() => setIsErrorDismissed(true)}
          onPrimaryAction={retry}
        />
      )}
    </main>
  );
}

export default function FuncionariosWorkspace() {
  const { selectedEmpresa } = useEmpresas();

  if (!selectedEmpresa) return <NoCompanyState />;

  return (
    <SelectedEmpresaWorkspace
      empresa={{
        codigo: String(selectedEmpresa.CODIGO),
        nome: selectedEmpresa.NOMEABREVIADO || selectedEmpresa.RAZAOSOCIAL,
      }}
    />
  );
}
