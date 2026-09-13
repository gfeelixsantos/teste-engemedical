'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDynamicNestUrl } from '@/config/constants';
import { HeaderKpisEsocial } from './components/HeaderKpisEsocial';
import { XmlPillsFilter } from './components/XmlPillsFilter';
import { StatusXmlCards } from './components/StatusXmlCards';
import { PainelRegistrosSection } from './components/PainelRegistrosSection';
import { AnaliseEmpresasSection } from './components/AnaliseEmpresasSection';
import { TabelaHierarquicaSection } from './components/TabelaHierarquicaSection';
import { TabelaEventosDetalhados } from './components/TabelaEventosDetalhados';
import type { EsocialDashboardData } from './types';
import { X, SlidersHorizontal, RefreshCw } from 'lucide-react';

export default function EsocialPage() {
  const [selectedXml, setSelectedXml] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery<EsocialDashboardData>({
    queryKey: ['esocial', selectedXml, dataInicio, dataFim],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedXml) params.set('layout', selectedXml);
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      const res = await fetch(`${getDynamicNestUrl()}esocial/dashboard?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar dados');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const isFiltering = !!selectedXml || !!dataInicio || !!dataFim;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const clearAllFilters = () => {
    setSelectedXml('');
    setDataInicio('');
    setDataFim('');
  };

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Limpa o cache do backend e busca dados frescos do SOC
      await fetch(`${getDynamicNestUrl()}esocial/refresh`);
      // Invalida o cache do React Query para forçar re-fetch de todos os filtros
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Header Branding + Top 3 KPIs + Botão Refresh */}
        <div className="relative">
          <HeaderKpisEsocial
            totalEmpresas={data?.kpis?.totalEmpresas}
            pctInconsistentes={data?.kpis?.taxaConclusao ? Math.round(100 - data.kpis.taxaConclusao) : 33}
            totalRegistrosXml={data?.kpis?.totalRegistros}
          />
          <div className="absolute top-3 right-3">
            <button
              onClick={handleForceRefresh}
              disabled={isRefreshing || isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-white/90 border border-gray-200 text-gray-600 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              title="Limpar cache e buscar dados atualizados do SOC (inclui 2026)"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
            </button>
          </div>
        </div>

        {/* Registro XML - Pill Selector */}
        <XmlPillsFilter
          selectedXml={selectedXml}
          onSelectXml={(xml) => setSelectedXml(xml)}
        />

        {/* Chip de Filtro Ativo + Indicador de Loading */}
        {(isFiltering || isFetching) && (
          <div className="flex items-center gap-3 flex-wrap">
            {isFetching && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 bg-sky-50 border border-sky-200 rounded-full px-3 py-1 animate-pulse">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Aplicando filtro...
              </div>
            )}
            {selectedXml && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 bg-sky-100 border border-sky-300 rounded-full px-3 py-1">
                <SlidersHorizontal className="w-3 h-3" />
                Filtro: <span className="font-bold">{selectedXml}</span>
                <button
                  onClick={() => setSelectedXml('')}
                  className="ml-1 hover:text-red-500 transition-colors"
                  title="Remover filtro"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {isFiltering && (
              <button
                onClick={clearAllFilters}
                className="text-[11px] text-gray-500 hover:text-red-500 font-semibold underline transition-colors"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
        )}

        {/* Overlay de loading suave sobre os dados */}
        <div className={`transition-opacity duration-200 ${isFetching && !isLoading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>

          {/* Status dos Arquivos XML (Cards Retangulares Coloridos) */}
          <StatusXmlCards
            kpis={data?.kpis}
            totalRegistros={data?.kpis?.totalRegistros}
          />

          {/* Painel de Registros eSocial (Donut + Evolução Mensal + Status por Mês) */}
          <PainelRegistrosSection
            porLayout={data?.charts?.por_layout}
            porMes={data?.charts?.por_mes}
            porMesStatus={data?.charts?.por_mes_status}
          />

          {/* Análise de Registros por Empresa (Comparativo + Não Concluídos) */}
          <AnaliseEmpresasSection
            porEmpresaComparativo={data?.charts?.por_empresa_comparativo}
            porEmpresaStatus={data?.charts?.por_empresa_status}
          />

          {/* Tabela Hierárquica: Ano > Mês > Evento > Empresa */}
          <TabelaHierarquicaSection matrix={data?.matrix} />

          {/* Eventos eSocial (Tabela Lista Detalhada / Drilldown) */}
          <TabelaEventosDetalhados rows={data?.rows} />
        </div>
      </div>
    </div>
  );
}

