'use client';

import { useQuery } from '@tanstack/react-query';
import { NEST_URL } from '@/config/constants';
import { KpiCards } from './components/KpiCards';
import { StatusXmlChart } from './components/StatusXmlChart';
import { EventosDonut } from './components/EventosDonut';
import { EvolucaoMensal } from './components/EvolucaoMensal';
import { ComparativoEmpresas } from './components/ComparativoEmpresas';
import { NaoConcluidosEmpresa } from './components/NaoConcluidosEmpresa';
import { StatusPorMes } from './components/StatusPorMes';
import { EsocialFilters } from './components/EsocialFilters';
import type { EsocialDashboardData, RegistroEsocial } from './types';
import { useState, useMemo } from 'react';

/* ─── Skeleton Dashboard (shown while loading) ─── */
function SkeletonDashboard() {
  const BarSkeleton = () => (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-48 mx-auto mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-5 bg-gray-200 rounded flex-1" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-2 animate-pulse">
          <div className="h-7 bg-gray-200 rounded w-64" />
          <div className="h-4 bg-gray-200 rounded w-80" />
        </div>
        {/* KPI skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gray-200 w-9 h-9" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
                  <div className="h-5 bg-gray-200 rounded w-14" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Chart skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarSkeleton />
          <BarSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarSkeleton />
          <BarSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarSkeleton />
          <BarSkeleton />
        </div>
      </div>
    </div>
  );
}

/* ─── Event Detail Table ─── */
function DetalhamentoTable({ rows }: { rows: RegistroEsocial[] }) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const statusColor = (s: string) => {
    if (s === 'Concluido') return 'text-green-700 bg-green-50';
    if (s === 'Inconsistencias') return 'text-red-700 bg-red-50';
    if (s === 'Pendente') return 'text-yellow-700 bg-yellow-50';
    if (s === 'Assinado') return 'text-teal-700 bg-teal-50';
    return 'text-gray-700 bg-gray-50';
  };

  if (!rows || rows.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Detalhamento dos Eventos
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-3 py-2">Empresa</th>
              <th className="px-3 py-2">Funcionário</th>
              <th className="px-3 py-2">Layout</th>
              <th className="px-3 py-2">Data Geração</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Erro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 max-w-[180px] truncate">{r.empresa}</td>
                <td className="px-3 py-2 max-w-[160px] truncate">{r.funcionario}</td>
                <td className="px-3 py-2">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {r.layout}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {formatDatePtBr(r.dataGeracao)}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor(r.statusEvento)}`}>
                    {r.statusEvento}
                  </span>
                </td>
                <td className="px-3 py-2 max-w-[200px] truncate text-red-600">
                  {r.erro || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500">
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} de {rows.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const MONTHS_PT: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

function formatDatePtBr(dateStr: string): string {
  if (!dateStr) return '—';
  // Try YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [ano, mes, dia] = parts;
    const monthName = MONTHS_PT[mes] || mes;
    return `${dia}/${monthName}/${ano}`;
  }
  // Try DD/MM/YYYY (already in pt-BR format)
  if (dateStr.includes('/')) return dateStr;
  return dateStr;
}

/* ─── Main Page ─── */
export default function EsocialPage() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const { data, isLoading, error } = useQuery<EsocialDashboardData>({
    queryKey: ['esocial', dataInicio, dataFim],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      const res = await fetch(`${NEST_URL}/esocial/dashboard?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar dados');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 max-w-md text-center">
          <div className="text-red-500 text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-semibold text-red-600 mb-2">Erro ao carregar dados</h2>
          <p className="text-gray-600 text-sm">Não foi possível carregar os dados do eSocial. Tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Painel de Registros eSocial
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Fonte: SOC Exporta Dados 186601 — Eventos eSocial
          </p>
        </div>

        {/* ROW 1: 6 KPI Cards — 3x2 grid */}
        <KpiCards kpis={data?.kpis} />

        <div className="mt-6">
          <EsocialFilters
            empresas={data?.filtros?.empresas || []}
            layouts={data?.filtros?.layouts || []}
            status={data?.filtros?.status || []}
            dataInicio={dataInicio}
            dataFim={dataFim}
            onFilterChange={(ini, fim) => {
              setDataInicio(ini);
              setDataFim(fim);
            }}
          />
        </div>

        {/* ROW 2: Status XML (horizontal bar) + Eventos por Tipo (donut) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <StatusXmlChart data={data?.charts?.por_status} />
          <EventosDonut data={data?.charts?.por_layout} />
        </div>

        {/* ROW 3: Evolução Mensal (line) + Status por Mês (stacked bar) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <EvolucaoMensal data={data?.charts?.por_mes} />
          <StatusPorMes data={data?.charts?.por_mes_status} />
        </div>

        {/* ROW 4: Comparativo Empresas + Não Concluídos por Empresa */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <ComparativoEmpresas data={data?.charts?.por_empresa} />
          <NaoConcluidosEmpresa data={data?.charts?.por_empresa_status} />
        </div>

        {/* ROW 5: Detalhamento dos Eventos table */}
        <DetalhamentoTable rows={data?.rows || []} />
      </main>
    </div>
  );
}
