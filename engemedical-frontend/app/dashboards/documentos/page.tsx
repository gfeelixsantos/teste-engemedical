'use client';

import { useQuery } from '@tanstack/react-query';
import { NEST_URL } from '@/config/constants';
import { logout } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HeaderApp } from '@/components/shared/HeaderApp';
import KpiCards from './components/KpiCards';
import VigenciaGeralDonut from './components/VigenciaGeralDonut';
import DocumentosPorTipo from './components/DocumentosPorTipo';
import VigenciaPorUnidade from './components/VigenciaPorUnidade';
import StatusDonut from './components/StatusDonut';
import DetalhamentoTable from './components/DetalhamentoTable';
import DocumentosFilters from './components/DocumentosFilters';
import type { DocumentosDashboardData } from './types';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse mb-2" />
            <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mt-2" />
          </div>
        ))}
      </div>
      {/* Filters skeleton */}
      <div className="flex gap-3">
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
      </div>
      {/* Charts row 1 skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      {/* Charts row 2 skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
        </div>
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
  const router = useRouter();
  const [empresaSel, setEmpresaSel] = useState('');
  const [unidadeSel, setUnidadeSel] = useState('');
  const [tipoSel, setTipoSel] = useState('');

  const { data, isLoading, error } = useQuery<DocumentosDashboardData>({
    queryKey: ['documentos-dashboard'],
    queryFn: async () => {
      const res = await fetch(`${NEST_URL}/documentos/dashboard`);
      if (!res.ok) throw new Error('Erro ao carregar dados');
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Filtrar registros
  const filteredRegistros = data?.registros?.filter((r) => {
    if (empresaSel && r.empresa !== empresaSel) return false;
    if (unidadeSel && r.unidade !== unidadeSel) return false;
    if (tipoSel && r.tipoDocumento !== tipoSel) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderApp onLogout={handleLogout} />

      <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">Documentos SST</h1>
          <p className="text-sm text-gray-500 mt-1">Controle de vencimento de documentos PGR e PCMSO</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            Erro ao carregar dados. Verifique o backend e tente novamente.
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && <DashboardSkeleton />}

        {!isLoading && data && (
          <>
            {/* KPIs - Row 1: 6 cards in 3x2 grid */}
            <KpiCards kpis={data.kpis} />

            {/* Filters */}
            <DocumentosFilters
              empresas={data.filtros?.empresas || []}
              unidades={data.filtros?.unidades || []}
              tipos={data.filtros?.tipos || []}
              empresaSel={empresaSel}
              unidadeSel={unidadeSel}
              tipoSel={tipoSel}
              onChange={(e, u, t) => { setEmpresaSel(e); setUnidadeSel(u); setTipoSel(t); }}
            />

            {/* Row 2: PCMSO por Unidade + PGR por Unidade (separate horizontal bar charts) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VigenciaPorUnidade
                data={data.vigenciaPorUnidadePCMSO}
                title="Vigência do PCMSO por Unidade"
              />
              <VigenciaPorUnidade
                data={data.vigenciaPorUnidadePGR}
                title="Vigência do PGR por Unidade"
              />
            </div>

            {/* Row 3: Vigência dos Contratos donut + Documentos por Tipo bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VigenciaGeralDonut data={data.vigenciaGeral} />
              <DocumentosPorTipo data={data.vigenciaPorTipo} />
            </div>

            {/* Row 4: Status dos Documentos donut */}
            <StatusDonut data={data.statusDocumentos} />

            {/* Table */}
            <DetalhamentoTable data={filteredRegistros} />

            {/* Footer */}
            {data.meta && (
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
