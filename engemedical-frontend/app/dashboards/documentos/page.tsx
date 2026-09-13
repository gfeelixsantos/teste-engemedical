'use client';

import { useQuery } from '@tanstack/react-query';
import { getDynamicNestUrl } from '@/config/constants';
import { useState } from 'react';
import { HeaderKpisDocumentos } from './components/HeaderKpisDocumentos';
import { VigenciaUnidadeCardsSection } from './components/VigenciaUnidadeCardsSection';
import { DocumentosGraficosGerais } from './components/DocumentosGraficosGerais';
import DetalhamentoDocumentosTable from './components/DetalhamentoDocumentosTable';
import type { DocumentosDashboardData } from './types';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI skeleton */}
      <div className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse shadow-sm" />
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-[280px] bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-[280px] bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      {/* Donut row skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse mb-3 mx-auto" />
            <div className="h-52 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DocumentosPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error } = useQuery<DocumentosDashboardData>({
    queryKey: ['documentos-dashboard'],
    queryFn: async () => {
      const res = await fetch(`${getDynamicNestUrl()}documentos/dashboard`);
      if (!res.ok) throw new Error('Erro ao carregar dados');
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">

        {/* Loading skeleton */}
        {isLoading && <DashboardSkeleton />}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            Erro ao carregar dados. Verifique o backend e tente novamente.
          </div>
        )}

        {/* Dashboard — falls back gracefully even when data is undefined */}
        {!isLoading && (
          <>
            {/* Row 1: Header KPIs */}
            <HeaderKpisDocumentos kpis={data?.kpis} />

            {/* Row 2: Vigência PCMSO + PGR por Unidade (barras + mini-cards) */}
            <VigenciaUnidadeCardsSection
              pcmso={data?.vigenciaPorUnidadePCMSO}
              pgr={data?.vigenciaPorUnidadePGR}
              pcmsoKpis={
                data
                  ? {
                      vigentes: data.vigenciaPorUnidadePCMSO?.reduce((s, i) => s + i.vigentes, 0) ?? 0,
                      aVencer: data.vigenciaPorUnidadePCMSO?.reduce((s, i) => s + i.aVencer, 0) ?? 0,
                      vencidos: data.vigenciaPorUnidadePCMSO?.reduce((s, i) => s + i.vencidos, 0) ?? 0,
                    }
                  : undefined
              }
              pgrKpis={
                data
                  ? {
                      vigentes: data.vigenciaPorUnidadePGR?.reduce((s, i) => s + i.vigentes, 0) ?? 0,
                      aVencer: data.vigenciaPorUnidadePGR?.reduce((s, i) => s + i.aVencer, 0) ?? 0,
                      vencidos: data.vigenciaPorUnidadePGR?.reduce((s, i) => s + i.vencidos, 0) ?? 0,
                    }
                  : undefined
              }
            />

            {/* Row 3: Donut Vigência + Bar Nº Docs + Donut Status */}
            <DocumentosGraficosGerais
              vigenciaGeral={data?.vigenciaGeral}
              vigenciaPorTipo={data?.vigenciaPorTipo}
              statusDocumentos={data?.statusDocumentos}
            />

            {/* Row 4: Detalhamento dos documentos - tabela completa */}
            <DetalhamentoDocumentosTable data={data?.registros} />

            {/* Footer */}
            {data?.meta && (
              <div className="text-xs text-gray-400 text-right">
                Fonte: {data.meta.fonte} | Base: {new Date(data.meta.dataBase).toLocaleString('pt-BR')}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
