'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDynamicNestUrl } from '@/config/constants';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { KpiCards } from './components/KpiCards';
import { TemporalLineChart } from './components/TemporalLineChart';
import { SituacaoDonut } from './components/SituacaoDonut';
import { TipoExameBarChart } from './components/TipoExameBarChart';
import { Status10BarChart } from './components/Status10BarChart';
import { TopEmpresasBarChart } from './components/TopEmpresasBarChart';
import { UnidadesPendenciasBarChart } from './components/UnidadesPendenciasBarChart';
import { DrilldownTable } from './components/DrilldownTable';
import { ConvocacaoFilters } from './components/ConvocacaoFilters';
import AppLoading from '@/components/shared/AppLoading';
import { DashboardPageHeader } from '@/components/shared/DashboardPageHeader';
import type { DashboardData, ConvocacaoExame } from './types';

const PAGE_SIZE = 10;

export default function ConvocacaoPage() {
  const [page, setPage] = useState(1);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState('');
  const [filtroExame, setFiltroExame] = useState('');

  // Estado da tabela filtrada (server-side)
  const [detalhesFiltrados, setDetalhesFiltrados] = useState<ConvocacaoExame[]>([]);
  const [totalFiltrados, setTotalFiltrados] = useState(0);
  const [totalPaginasFiltradas, setTotalPaginasFiltradas] = useState(1);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  const fetchDashboard = useCallback(async (): Promise<DashboardData> => {
    const res = await fetch(`${getDynamicNestUrl()}convocacao/dashboard`);
    if (!res.ok) throw new Error('Erro ao buscar dados do dashboard');
    return res.json();
  }, []);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['convocacao-dashboard'],
    queryFn: fetchDashboard,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Busca detalhes do servidor com filtragem real (full dataset — sem cap de 500)
  const fetchDetalhes = useCallback(async (
    empresa: string,
    situacao: string,
    exame: string,
    pg: number,
  ) => {
    setLoadingDetalhes(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(PAGE_SIZE) });
      if (empresa) params.set('empresa', empresa);
      if (situacao) params.set('situacao', situacao);
      if (exame) params.set('exame', exame);

      const res = await fetch(`${getDynamicNestUrl()}convocacao/detalhes?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      setDetalhesFiltrados(json.data ?? []);
      setTotalFiltrados(json.total ?? 0);
      setTotalPaginasFiltradas(json.totalPages ?? 1);
    } catch {
      // silently fail
    } finally {
      setLoadingDetalhes(false);
    }
  }, []);

  // Re-busca sempre que filtros ou página mudam
  useEffect(() => {
    if (!data) return;
    fetchDetalhes(filtroEmpresa, filtroSituacao, filtroExame, page);
  }, [data, filtroEmpresa, filtroSituacao, filtroExame, page, fetchDetalhes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <AppLoading title="Carregando convocações" description="Buscando dados do dashboard..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 min-h-[400px]">
        <p className="text-red-500 font-semibold">Erro ao carregar dados do dashboard</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-content flex flex-col h-full min-h-screen bg-slate-50/50">
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <DashboardPageHeader
          icon={Activity}
          title="Controle de Convocações de Exames"
          subtitle={`Contagem de exames — Última atualização: ${new Date(data.kpis.ultimaAtualizacao).toLocaleString('pt-BR')}`}
          onRefresh={refetch}
          isRefreshing={isFetching}
        />

        {/* ─── 4 Top KPI Cards ─── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <KpiCards kpis={data.kpis} />
        </motion.div>

        {/* ─── Section 1: Main Line Chart ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-gray-200 p-5 shadow-md"
        >
          <div className="text-center mb-2">
            <h2 className="text-base font-bold text-gray-800">
              Controle de Convocações de Exames
            </h2>
            <p className="text-xs font-medium text-gray-400">Contagem de Exames</p>
            <h3 className="text-sm font-semibold text-gray-700 mt-1">
              Monitoramento de Vencimentos por Período
            </h3>
          </div>
          <TemporalLineChart data={data.porAno} kpis={data.kpis} />
        </motion.div>

        {/* ─── Section 2: Donut + Grouped Bar Chart ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-md"
          >
            <h3 className="text-sm font-bold text-gray-800 mb-2 text-center">
              Volume de Exames — Situação
            </h3>
            <SituacaoDonut data={data.porSituacao} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-md"
          >
            <h3 className="text-sm font-bold text-gray-800 mb-2 text-center">
              Distribuição de Exames por Situação
            </h3>
            <TipoExameBarChart data={data.porTipoExame} />
          </motion.div>
        </div>

        {/* ─── Section 3: Monitoramento de Funcionários ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 p-5 shadow-md space-y-4"
        >
          <div className="text-center">
            <h2 className="text-base font-bold text-gray-800">
              Monitoramento de Funcionários com Exames a Vencer e Vencidos
            </h2>
            {/* Highlights Header */}
            <div className="flex items-center justify-center gap-8 mt-2 text-xs font-bold">
              <div>
                <span className="text-gray-600">Vencidos </span>
                <span className="text-[#D55E00] text-sm">
                  {data.kpis.funcionariosExamesVencidos.toLocaleString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Em dia </span>
                <span className="text-[#009E73] text-sm">
                  {data.kpis.funcionariosExamesEmDia.toLocaleString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">A Vencer </span>
                <span className="text-[#E69F00] text-sm">
                  {data.kpis.funcionariosExamesAVencer.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {/* 10 Status Faixas */}
            <div className="lg:border-r border-gray-100 pr-0 lg:pr-4">
              <h4 className="text-xs font-bold text-gray-700 text-center mb-2">
                Nº de Funcionários por Situação do Exame
              </h4>
              <Status10BarChart data={data.porStatus10} />
            </div>

            {/* Top Empresas */}
            <div className="lg:border-r border-gray-100 px-0 lg:px-2">
              <h4 className="text-xs font-bold text-gray-700 text-center mb-2">
                Nº de Funcionários com Exames a Vencer por Empresa
              </h4>
              <TopEmpresasBarChart data={data.porEmpresa} />
            </div>

            {/* Pendências por Unidade */}
            <div className="pl-0 lg:pl-2">
              <h4 className="text-xs font-bold text-gray-700 text-center mb-2">
                Nº de Funcionários com Pendências de Exames por Unidade
              </h4>
              <UnidadesPendenciasBarChart data={data.porUnidade} />
            </div>
          </div>
        </motion.div>

        {/* ─── Section 4: Filters & Drilldown Table ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-gray-200 p-5 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">
              Dados Gerais de Convocações de Exames
            </h2>
            <span className="text-xs font-medium text-gray-500">
              Total: {totalFiltrados.toLocaleString('pt-BR')} registros
              {(filtroEmpresa || filtroSituacao || filtroExame) && (
                <span className="ml-1 text-brand-600">(filtrado)</span>
              )}
            </span>
          </div>

          <ConvocacaoFilters
            empresas={data.filtros.empresas}
            situacoes={data.filtros.situacoes}
            filtroEmpresa={filtroEmpresa}
            filtroSituacao={filtroSituacao}
            filtroExame={filtroExame}
            exames={data.filtros.exames ?? Array.from(new Set(data.detalhes.map((d) => d.exame))).sort()}
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

          {loadingDetalhes ? (
            <div className="flex items-center justify-center py-10 text-xs text-gray-400">
              Filtrando registros...
            </div>
          ) : (
            <DrilldownTable data={detalhesFiltrados} />
          )}

          {totalPaginasFiltradas > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-500">
                Página {page} de {totalPaginasFiltradas}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4 inline" /> Anterior
                </button>
                <button
                  type="button"
                  disabled={page === totalPaginasFiltradas}
                  onClick={() => setPage((p) => Math.min(totalPaginasFiltradas, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                >
                  Próxima <ChevronRight className="h-4 w-4 inline" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
