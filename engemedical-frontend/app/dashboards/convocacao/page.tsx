'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NEST_URL } from '@/config/constants';
import { logout } from '@/lib/utils';
import { HeaderApp } from '@/components/shared/HeaderApp';
import { RefreshCw, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { KpiCards } from './components/KpiCards';
import { SituacaoDonut } from './components/SituacaoDonut';
import { TemporalLineChart } from './components/TemporalLineChart';
import { TipoExameBarChart } from './components/TipoExameBarChart';
import { DrilldownTable } from './components/DrilldownTable';
import { ConvocacaoFilters } from './components/ConvocacaoFilters';
import EngemedicalLoading from '@/components/shared/EngemedicalLoading';
import type { DashboardData } from './types';

const PAGE_SIZE = 200;

export default function ConvocacaoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState('');
  const [filtroExame, setFiltroExame] = useState('');

  const fetchDashboard = useCallback(async (): Promise<DashboardData> => {
    const res = await fetch(`${NEST_URL}convocacao/dashboard`);
    if (!res.ok) throw new Error('Erro ao buscar dados do dashboard');
    return res.json();
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['convocacao-dashboard'],
    queryFn: fetchDashboard,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <EngemedicalLoading />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-500">Erro ao carregar dados do dashboard</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // Filtrar detalhes
  const detalhesFiltrados = data.detalhes.filter((d) => {
    if (filtroEmpresa && d.nomeEmpresa !== filtroEmpresa) return false;
    if (filtroSituacao && d.situacaoExame !== filtroSituacao) return false;
    if (filtroExame && d.exame !== filtroExame) return false;
    return true;
  });

  // Paginação client-side dos detalhes
  const totalPaginas = Math.ceil(detalhesFiltrados.length / PAGE_SIZE);
  const detalhesPagina = detalhesFiltrados.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <div className="flex flex-col h-full">
      <HeaderApp onLogout={logout}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboards')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Controle de Convocações de Exames
              </h1>
              <p className="text-xs text-gray-400">
                Contagem de Exames — Última atualização:{' '}
                {new Date(data.kpis.ultimaAtualizacao).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </HeaderApp>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {/* ─── Row 1: LineChart (temporal por ano) + KPIs à direita ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-4 lg:col-span-3"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Monitoramento de Vencimentos por Período
            </h3>
            <TemporalLineChart data={data.porAno} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col justify-center"
          >
            <KpiCards kpis={data.kpis} />
          </motion.div>
        </div>

        {/* ─── Row 2: Donut (situação) + Barras agrupadas (tipo exame) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Volume de Exames — Situação
            </h3>
            <SituacaoDonut data={data.porSituacao} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Distribuição de Exames por Situação
            </h3>
            <TipoExameBarChart data={data.porTipoExame} />
          </motion.div>
        </div>

        {/* ─── Filtros ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ConvocacaoFilters
            empresas={data.filtros.empresas}
            situacoes={data.filtros.situacoes}
            filtroEmpresa={filtroEmpresa}
            filtroSituacao={filtroSituacao}
            filtroExame={filtroExame}
            exames={Array.from(new Set(data.detalhes.map((d) => d.exame))).sort()}
            onEmpresaChange={(v) => { setFiltroEmpresa(v); setPage(1); }}
            onSituacaoChange={(v) => { setFiltroSituacao(v); setPage(1); }}
            onExameChange={(v) => { setFiltroExame(v); setPage(1); }}
            onClear={() => {
              setFiltroEmpresa('');
              setFiltroSituacao('');
              setFiltroExame('');
              setPage(1);
            }}
          />
        </motion.div>

        {/* ─── Tabela Drilldown com Paginação ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Detalhes ({detalhesFiltrados.length.toLocaleString('pt-BR')} registros)
            </h3>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-500">
                  {page} / {totalPaginas}
                </span>
                <button
                  type="button"
                  disabled={page === totalPaginas}
                  onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                  className="p-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <DrilldownTable data={detalhesPagina} />
        </motion.div>
      </div>
    </div>
  );
}
